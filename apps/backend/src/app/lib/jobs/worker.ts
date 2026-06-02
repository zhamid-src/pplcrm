import { ImportsRepo } from '../../modules/imports/repositories/imports.repo';
import { sql } from 'kysely';
import { executeJob } from './job-handlers';

export class BackgroundJobWorker {
  private isRunning = false;
  private timer: NodeJS.Timeout | null = null;
  private recoveryInterval: NodeJS.Timeout | null = null;
  private activeJobsCount = 0;
  private shutdownResolver: (() => void) | null = null;

  private readonly importsRepo = new ImportsRepo();
  private readonly db = this.importsRepo.db; // Kysely DB instance

  public start() {
    if (this.isRunning) return;
    this.isRunning = true;
    console.log('Background Job Worker started.');

    this.ensureCleanupJobScheduled().catch((err) => console.error('Failed to ensure cleanup job scheduled:', err));
    this.ensureSyncSchedulerJobScheduled().catch((err) =>
      console.error('Failed to ensure sync scheduler job scheduled:', err),
    );
    this.ensureDuplicatesRecomputeJobScheduled().catch((err) =>
      console.error('Failed to ensure duplicates recompute job scheduled:', err),
    );
    this.ensureAddressFingerprintsJobScheduled().catch((err) =>
      console.error('Failed to ensure address fingerprints job scheduled:', err),
    );
    this.ensureWorkflowsJobScheduled().catch((err) =>
      console.error('Failed to ensure workflows job scheduled:', err),
    );

    // Run stale job recovery on startup and then every 5 minutes
    this.recoverStaleJobs().catch((err) => console.error('Failed to recover stale jobs on startup:', err));
    this.recoveryInterval = setInterval(
      () => {
        this.recoverStaleJobs().catch((err) => console.error('Failed to recover stale jobs:', err));
      },
      5 * 60 * 1000,
    );

    this.poll();
  }

  public async stop(): Promise<void> {
    this.isRunning = false;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    if (this.recoveryInterval) {
      clearInterval(this.recoveryInterval);
      this.recoveryInterval = null;
    }

    if (this.activeJobsCount > 0) {
      console.log(
        `Background Job Worker: Waiting for ${this.activeJobsCount} active jobs to complete before shutting down...`,
      );
      await new Promise<void>((resolve) => {
        this.shutdownResolver = resolve;
      });
    }
    console.log('Background Job Worker stopped.');
  }

  private poll() {
    if (!this.isRunning) return;

    this.timer = setTimeout(async () => {
      let processedAJob = false;
      try {
        this.activeJobsCount++;
        processedAJob = await this.processNextJob();
      } catch (err) {
        console.error('Error in background job worker poll cycle:', err);
      } finally {
        this.activeJobsCount--;

        // If shutdown was requested and no active jobs remain, resolve the stop() promise
        if (!this.isRunning && this.activeJobsCount === 0 && this.shutdownResolver) {
          this.shutdownResolver();
          return;
        }

        // Poll again immediately (10ms) if we processed a job (to drain the queue),
        // or back off to 2 seconds if no jobs were found.
        const delay = processedAJob ? 10 : 2000;
        this.pollWithDelay(delay);
      }
    }, 0);
  }

  private pollWithDelay(ms: number) {
    if (!this.isRunning) return;
    this.timer = setTimeout(() => this.poll(), ms);
  }

  private async processNextJob(): Promise<boolean> {
    const workerId = `worker-${process.pid}-${Math.random().toString(36).slice(2, 9)}`;

    // Try to find and lock a job using SKIP LOCKED
    const job = await this.db.transaction().execute(async (trx: any) => {
      const pendingJob = (await trx
        .selectFrom('background_jobs' as any)
        .selectAll()
        .where('status', '=', 'pending')
        .where('run_at', '<=', new Date())
        .orderBy('id', 'asc')
        .limit(1)
        .forUpdate()
        .skipLocked()
        .executeTakeFirst()) as any;

      if (!pendingJob) return null;

      const updatedJob = await trx
        .updateTable('background_jobs' as any)
        .set({
          status: 'processing',
          locked_at: new Date(),
          locked_by: workerId,
          attempts: Number(pendingJob.attempts || 0) + 1,
          updated_at: new Date(),
        })
        .where('id', '=', pendingJob.id)
        .returningAll()
        .executeTakeFirst();

      return updatedJob;
    });

    if (!job) return false;

    console.log(`Processing job ${job.id} (Queue: ${job.queue}, Status: ${job.status})`);

    const payload = typeof job.payload === 'string' ? JSON.parse(job.payload) : job.payload;

    try {
      await executeJob(payload, this.db, job.id);

      // Mark job as completed
      await this.db
        .updateTable('background_jobs' as any)
        .set({
          status: 'completed',
          locked_at: null,
          locked_by: null,
          updated_at: new Date(),
        })
        .where('id', '=', job.id)
        .execute();

      console.log(`Job ${job.id} completed successfully.`);
    } catch (err: any) {
      const errorMsg = err?.message || String(err);
      console.error(`Failed to process background job ${job.id}:`, err);

      try {
        // If it was an import job, mark the import as failed and store the error message
        if (payload.import_id) {
          await this.importsRepo.update({
            tenant_id: payload.tenant_id as any,
            id: payload.import_id as any,
            row: {
              status: 'failed',
              error_message: errorMsg.substring(0, 1000), // Truncate just in case
              processed_at: new Date(),
              updated_at: new Date(),
            } as any,
          });
        }
      } catch (dbErr) {
        console.error('Failed to mark data_imports as failed:', dbErr);
      }

      const attempts = Number(job.attempts || 0);
      const maxAttempts = Number(job.max_attempts || 3);

      if (attempts < maxAttempts) {
        // Retry with backoff (exponential backoff for mail, linear for others)
        const isMail =
          payload.type === 'send-transactional-email' ||
          payload.type === 'send-form-notifications' ||
          payload.type === 'send-shift-reminder' ||
          payload.type === 'send-newsletter';
        const delaySeconds = isMail ? Math.pow(2, attempts) * 30 : attempts * 30;
        const runAt = new Date(Date.now() + delaySeconds * 1000);
        console.log(`Rescheduling job ${job.id} to run at ${runAt.toISOString()} (Attempt ${attempts}/${maxAttempts})`);

        await this.db
          .updateTable('background_jobs' as any)
          .set({
            status: 'pending',
            locked_at: null,
            locked_by: null,
            error: errorMsg,
            run_at: runAt,
            updated_at: new Date(),
          })
          .where('id', '=', job.id)
          .execute();
      } else {
        console.error(`Job ${job.id} exceeded maximum attempts (${maxAttempts}). Marking as failed.`);
        await this.db
          .updateTable('background_jobs' as any)
          .set({
            status: 'failed',
            locked_at: null,
            locked_by: null,
            error: errorMsg,
            updated_at: new Date(),
          })
          .where('id', '=', job.id)
          .execute();

        // If a recurrent cron-like job fails permanently, schedule the next iteration
        await this.rescheduleCronJobOnFailure(payload.type);
      }
    }

    return true;
  }

  private async rescheduleCronJobOnFailure(type: string): Promise<void> {
    let delayMs = 0;
    if (type === 'cleanup_activities') {
      delayMs = 24 * 60 * 60 * 1000;
    } else if (type === 'schedule_sync_jobs') {
      delayMs = 10 * 60 * 1000;
    } else if (type === 'recompute_all_duplicates') {
      delayMs = 24 * 60 * 60 * 1000;
    } else if (type === 'recompute_address_fingerprints') {
      delayMs = 24 * 60 * 60 * 1000;
    } else if (type === 'process_drip_workflows') {
      delayMs = 10 * 60 * 1000;
    }


    if (delayMs > 0) {
      try {
        await this.db
          .insertInto('background_jobs' as any)
          .values({
            tenant_id: null,
            queue: 'default',
            status: 'pending',
            payload: JSON.stringify({ type }),
            run_at: new Date(Date.now() + delayMs),
            max_attempts: 3,
          })
          .execute();
      } catch (schedErr) {
        console.error(`Failed to reschedule failed cron job (${type}):`, schedErr);
      }
    }
  }

  private async ensureCleanupJobScheduled(): Promise<void> {
    try {
      await this.db.transaction().execute(async (trx: any) => {
        const existing = await trx
          .selectFrom('background_jobs' as any)
          .select('id')
          .where('status', 'in', ['pending', 'processing'])
          .where(sql`payload->>'type'`, '=', 'cleanup_activities')
          .forUpdate()
          .executeTakeFirst();
        if (!existing) {
          console.log('Scheduling daily activity feed cleanup background job…');
          await trx
            .insertInto('background_jobs' as any)
            .values({
              tenant_id: null,
              queue: 'default',
              status: 'pending',
              payload: JSON.stringify({ type: 'cleanup_activities' }),
              run_at: new Date(),
              max_attempts: 3,
            })
            .execute();
        }
      });
    } catch (err) {
      console.error('Failed to ensure cleanup job scheduled:', err);
    }
  }

  private async ensureSyncSchedulerJobScheduled(): Promise<void> {
    try {
      await this.db.transaction().execute(async (trx: any) => {
        const existing = await trx
          .selectFrom('background_jobs' as any)
          .select('id')
          .where('status', 'in', ['pending', 'processing'])
          .where(sql`payload->>'type'`, '=', 'schedule_sync_jobs')
          .forUpdate()
          .executeTakeFirst();
        if (!existing) {
          console.log('Scheduling sync scheduler background job…');
          await trx
            .insertInto('background_jobs' as any)
            .values({
              tenant_id: null,
              queue: 'default',
              status: 'pending',
              payload: JSON.stringify({ type: 'schedule_sync_jobs' }),
              run_at: new Date(),
              max_attempts: 3,
            })
            .execute();
        }
      });
    } catch (err) {
      console.error('Failed to ensure sync scheduler job scheduled:', err);
    }
  }

  private async ensureDuplicatesRecomputeJobScheduled(): Promise<void> {
    try {
      await this.db.transaction().execute(async (trx: any) => {
        const existing = await trx
          .selectFrom('background_jobs' as any)
          .select('id')
          .where('status', 'in', ['pending', 'processing'])
          .where(sql`payload->>'type'`, '=', 'recompute_all_duplicates')
          .forUpdate()
          .executeTakeFirst();
        if (!existing) {
          console.log('Scheduling nightly duplicates recomputation background job…');
          await trx
            .insertInto('background_jobs' as any)
            .values({
              tenant_id: null,
              queue: 'default',
              status: 'pending',
              payload: JSON.stringify({ type: 'recompute_all_duplicates' }),
              run_at: new Date(),
              max_attempts: 3,
            })
            .execute();
        }
      });
    } catch (err) {
      console.error('Failed to ensure duplicates recompute job scheduled:', err);
    }
  }

  private async ensureAddressFingerprintsJobScheduled(): Promise<void> {
    try {
      await this.db.transaction().execute(async (trx: any) => {
        const existing = await trx
          .selectFrom('background_jobs' as any)
          .select('id')
          .where('status', 'in', ['pending', 'processing'])
          .where(sql`payload->>'type'`, '=', 'recompute_address_fingerprints')
          .forUpdate()
          .executeTakeFirst();
        if (!existing) {
          console.log('Scheduling nightly address fingerprints recomputation background job…');
          await trx
            .insertInto('background_jobs' as any)
            .values({
              tenant_id: null,
              queue: 'default',
              status: 'pending',
              payload: JSON.stringify({ type: 'recompute_address_fingerprints' }),
              run_at: new Date(),
              max_attempts: 3,
            })
            .execute();
        }
      });
    } catch (err) {
      console.error('Failed to ensure address fingerprints job scheduled:', err);
    }
  }

  private async ensureWorkflowsJobScheduled(): Promise<void> {
    try {
      await this.db.transaction().execute(async (trx: any) => {
        const existing = await trx
          .selectFrom('background_jobs' as any)
          .select('id')
          .where('status', 'in', ['pending', 'processing'])
          .where(sql`payload->>'type'`, '=', 'process_drip_workflows')
          .forUpdate()
          .executeTakeFirst();
        if (!existing) {
          console.log('Scheduling periodic drip workflows processing background job…');
          await trx
            .insertInto('background_jobs' as any)
            .values({
              tenant_id: null,
              queue: 'default',
              status: 'pending',
              payload: JSON.stringify({ type: 'process_drip_workflows' }),
              run_at: new Date(),
              max_attempts: 3,
            })
            .execute();
        }
      });
    } catch (err) {
      console.error('Failed to ensure workflows job scheduled:', err);
    }
  }


  private async recoverStaleJobs(): Promise<void> {
    try {
      const staleTime = new Date(Date.now() - 30 * 60 * 1000); // 30 minutes
      await this.db
        .updateTable('background_jobs' as any)
        .set({
          status: 'pending',
          locked_at: null,
          locked_by: null,
          updated_at: new Date(),
          error: 'Job processing timed out',
        })
        .where('status', '=', 'processing')
        .where('locked_at', '<', staleTime)
        .execute();
    } catch (err) {
      console.error('Failed to recover stale background jobs:', err);
    }
  }
}
