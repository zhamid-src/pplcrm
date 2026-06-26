import { sql } from 'kysely';
import { Client } from 'pg';

import { env } from '../../../env';
import { ImportsRepo } from '../../modules/imports/repositories/imports.repo';
import { executeJob } from './job-handlers';

export class BackgroundJobWorker {
  private readonly importsRepo = new ImportsRepo();
  private readonly db = this.importsRepo.db; // Kysely DB instance

  private activeJobsCount = 0;
  private isRunning = false;
  private pgClient: Client | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private recoveryInterval: NodeJS.Timeout | null = null;
  private shutdownResolver: (() => void) | null = null;
  private timer: NodeJS.Timeout | null = null;

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
    this.ensureWorkflowsJobScheduled().catch((err) => console.error('Failed to ensure workflows job scheduled:', err));
    this.ensurePerformScheduledDeletionsJobScheduled().catch((err) =>
      console.error('Failed to ensure perform scheduled deletions job scheduled:', err),
    );
    this.ensureUsageLimitChecksScheduled().catch((err) =>
      console.error('Failed to ensure usage limit checks scheduled:', err),
    );
    this.ensureDueTasksCheckScheduled().catch((err) =>
      console.error('Failed to ensure due tasks check scheduled:', err),
    );
    this.ensureCompaniesGoogleRefreshJobScheduled().catch((err) =>
      console.error('Failed to ensure companies google refresh job scheduled:', err),
    );
    this.ensurePruneNewsletterEventsJobScheduled().catch((err) =>
      console.error('Failed to ensure prune newsletter events job scheduled:', err),
    );

    // Run stale job recovery on startup and then every 5 minutes
    this.recoverStaleJobs().catch((err) => console.error('Failed to recover stale jobs on startup:', err));
    this.recoveryInterval = setInterval(
      () => {
        this.recoverStaleJobs().catch((err) => console.error('Failed to recover stale jobs:', err));
      },
      5 * 60 * 1000,
    );

    this.setupListener();
    this.poll();
  }

  public async stop(): Promise<void> {
    this.isRunning = false;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.recoveryInterval) {
      clearInterval(this.recoveryInterval);
      this.recoveryInterval = null;
    }
    if (this.pgClient) {
      try {
        await this.pgClient.end();
      } catch (err) {
        console.error('Error closing Postgres listener client on shutdown:', err);
      }
      this.pgClient = null;
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

  private async ensureCompaniesGoogleRefreshJobScheduled(): Promise<void> {
    try {
      await this.db.transaction().execute(async (trx: any) => {
        const existing = await trx
          .selectFrom('background_jobs' as any)
          .select('id')
          .where('status', 'in', ['pending', 'processing'])
          .where(sql`payload->>'type'`, '=', 'refresh_companies_google')
          .forUpdate()
          .executeTakeFirst();
        if (!existing) {
          console.log('Scheduling daily company google enrichment background job…');
          await trx
            .insertInto('background_jobs' as any)
            .values({
              tenant_id: null,
              queue: 'default',
              status: 'pending',
              payload: JSON.stringify({ type: 'refresh_companies_google' }),
              run_at: new Date(),
              max_attempts: 3,
            })
            .execute();
        }
      });
    } catch (err) {
      console.error('Failed to ensure companies google refresh job scheduled:', err);
    }
  }

  private async ensureDueTasksCheckScheduled(): Promise<void> {
    try {
      await this.db.transaction().execute(async (trx: any) => {
        const existing = await trx
          .selectFrom('background_jobs' as any)
          .select('id')
          .where('status', 'in', ['pending', 'processing'])
          .where(sql`payload->>'type'`, '=', 'check_due_tasks')
          .forUpdate()
          .executeTakeFirst();
        if (!existing) {
          console.log('Scheduling daily due tasks check background job…');
          await trx
            .insertInto('background_jobs' as any)
            .values({
              tenant_id: null,
              queue: 'default',
              status: 'pending',
              payload: JSON.stringify({ type: 'check_due_tasks' }),
              run_at: new Date(),
              max_attempts: 3,
            })
            .execute();
        }
      });
    } catch (err) {
      console.error('Failed to ensure due tasks check scheduled:', err);
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

  private async ensurePerformScheduledDeletionsJobScheduled(): Promise<void> {
    try {
      await this.db.transaction().execute(async (trx: any) => {
        const existing = await trx
          .selectFrom('background_jobs' as any)
          .select('id')
          .where('status', 'in', ['pending', 'processing'])
          .where(sql`payload->>'type'`, '=', 'perform_scheduled_deletions')
          .forUpdate()
          .executeTakeFirst();
        if (!existing) {
          console.log('Scheduling daily scheduled deletions background job…');
          await trx
            .insertInto('background_jobs' as any)
            .values({
              tenant_id: null,
              queue: 'default',
              status: 'pending',
              payload: JSON.stringify({ type: 'perform_scheduled_deletions' }),
              run_at: new Date(),
              max_attempts: 3,
            })
            .execute();
        }
      });
    } catch (err) {
      console.error('Failed to ensure perform scheduled deletions job scheduled:', err);
    }
  }

  private async ensurePruneNewsletterEventsJobScheduled(): Promise<void> {
    try {
      await this.db.transaction().execute(async (trx: any) => {
        const existing = await trx
          .selectFrom('background_jobs' as any)
          .select('id')
          .where('status', 'in', ['pending', 'processing'])
          .where(sql`payload->>'type'`, '=', 'prune_newsletter_events')
          .forUpdate()
          .executeTakeFirst();
        if (!existing) {
          console.log('Scheduling daily newsletter events pruning background job…');
          await trx
            .insertInto('background_jobs' as any)
            .values({
              tenant_id: null,
              queue: 'default',
              status: 'pending',
              payload: JSON.stringify({ type: 'prune_newsletter_events' }),
              run_at: new Date(),
              max_attempts: 3,
            })
            .execute();
        }
      });
    } catch (err) {
      console.error('Failed to ensure prune newsletter events job scheduled:', err);
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

  private async ensureUsageLimitChecksScheduled(): Promise<void> {
    try {
      await this.db.transaction().execute(async (trx: any) => {
        const existing = await trx
          .selectFrom('background_jobs' as any)
          .select('id')
          .where('status', 'in', ['pending', 'processing'])
          .where(sql`payload->>'type'`, '=', 'check_all_usage_limits')
          .forUpdate()
          .executeTakeFirst();
        if (!existing) {
          console.log('Scheduling daily usage limits check background job…');
          await trx
            .insertInto('background_jobs' as any)
            .values({
              tenant_id: null,
              queue: 'default',
              status: 'pending',
              payload: JSON.stringify({ type: 'check_all_usage_limits' }),
              run_at: new Date(),
              max_attempts: 3,
            })
            .execute();
        }
      });
    } catch (err) {
      console.error('Failed to ensure usage limit checks scheduled:', err);
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
        } else {
          // Poll again immediately (10ms) if we processed a job (to drain the queue),
          // or back off to 30 seconds if no jobs were found.
          const delay = processedAJob ? 10 : 30000;
          this.pollWithDelay(delay);
        }
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
          payload.type === 'send-webform-notifications' ||
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

        if (payload.export_id) {
          try {
            const { ExportsRepo } = await import('../../modules/exports/repositories/exports.repo');
            const exportsRepo = new ExportsRepo();
            await exportsRepo.updateStatus(String(payload.export_id), String(payload.tenant_id), 'failed', {
              error: `Export failed after all retries. Last error: ${errorMsg.substring(0, 400)}`,
            });
          } catch (exportErr) {
            console.error('Failed to update export status on job permanent failure:', exportErr);
          }
        }

        if (payload.type === 'ms_sync' && payload.userId) {
          const correlationId = Math.random().toString(36).slice(2, 10).toUpperCase();
          console.error(`[sync-error][${correlationId}] MS sync permanently failed for user ${payload.userId}:`, err);
          try {
            const { MsOAuthService } = await import('../../modules/ms-sync/ms-oauth.service');
            const { env } = await import('../../../env');
            const oauthSvc = new MsOAuthService(this.db as any, {
              clientId: env.msClientId ?? '',
              clientSecret: env.msClientSecret ?? '',
              tenantId: env.msTenantId ?? 'common',
              redirectUri: env.msRedirectUri ?? `${env.apiUrl}/auth/ms/callback`,
            });
            await oauthSvc.recordSyncError(payload.userId, `Sync failed — support code: ${correlationId}`);
          } catch (recordErr) {
            console.error('Failed to record MS sync error on token:', recordErr);
          }
        }

        if (payload.type === 'google_sync' && payload.userId) {
          const correlationId = Math.random().toString(36).slice(2, 10).toUpperCase();
          console.error(
            `[sync-error][${correlationId}] Google sync permanently failed for user ${payload.userId}:`,
            err,
          );
          try {
            const { GoogleOAuthService } = await import('../../modules/google-sync/google-oauth.service');
            const { env } = await import('../../../env');
            const oauthSvc = new GoogleOAuthService(this.db as any, {
              clientId: env.googleClientId ?? '',
              clientSecret: env.googleClientSecret ?? '',
              redirectUri: env.googleRedirectUri ?? `${env.apiUrl}/auth/google/callback`,
            });
            await oauthSvc.recordSyncError(payload.userId, `Sync failed — support code: ${correlationId}`);
          } catch (recordErr) {
            console.error('Failed to record Google sync error on token:', recordErr);
          }
        }

        // If a recurrent cron-like job fails permanently, schedule the next iteration
        await this.rescheduleCronJobOnFailure(payload.type);
      }
    }

    return true;
  }

  private reconnectListener() {
    if (this.pgClient) {
      this.pgClient.end().catch();
      this.pgClient = null;
    }
    if (!this.isRunning) return;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => {
      this.setupListener();
    }, 5000);
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

      // Clean up/timeout data exports stuck in pending/processing for more than 1 hour
      const staleExportTime = new Date(Date.now() - 60 * 60 * 1000); // 1 hour
      const staleExports = await this.db
        .selectFrom('data_exports' as any)
        .select(['id', 'tenant_id'])
        .where('status', 'in', ['pending', 'processing'])
        .where('created_at', '<', staleExportTime)
        .execute();

      if (staleExports.length > 0) {
        const ids = staleExports.map((e: any) => e.id as any);
        await this.db
          .updateTable('data_exports' as any)
          .set({
            status: 'failed',
            error: 'Export processing timed out',
            updated_at: new Date(),
          })
          .where('id', 'in', ids)
          .execute();

        for (const exp of staleExports) {
          await this.db
            .deleteFrom('background_jobs' as any)
            .where('tenant_id', '=', exp.tenant_id as any)
            .where(sql`payload->>'type'`, '=', 'export_csv')
            .where(sql`payload->>'export_id'`, '=', String(exp.id))
            .execute();
        }
      }
    } catch (err) {
      console.error('Failed to recover stale background jobs:', err);
    }
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
    } else if (type === 'perform_scheduled_deletions') {
      delayMs = 24 * 60 * 60 * 1000;
    } else if (type === 'check_all_usage_limits') {
      delayMs = 24 * 60 * 60 * 1000;
    } else if (type === 'refresh_companies_google') {
      delayMs = 24 * 60 * 60 * 1000;
    } else if (type === 'prune_newsletter_events') {
      delayMs = 24 * 60 * 60 * 1000;
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

  private async setupListener() {
    if (!this.isRunning) return;
    try {
      this.pgClient = new Client(env.db);
      await this.pgClient.connect();

      this.pgClient.on('notification', (msg) => {
        if (msg.channel === 'background_jobs_channel') {
          console.log('Background Job Worker received notify, waking up...');
          this.wakeUp();
        }
      });

      this.pgClient.on('error', (err) => {
        console.error('Postgres listener client error:', err);
        this.reconnectListener();
      });

      this.pgClient.on('end', () => {
        console.warn('Postgres listener connection closed.');
        this.reconnectListener();
      });

      await this.pgClient.query('LISTEN background_jobs_channel');
      console.log('Listening for background_jobs notifications...');
    } catch (err) {
      console.error('Failed to setup Postgres listener:', err);
      this.reconnectListener();
    }
  }

  private wakeUp() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.poll();
  }
}
