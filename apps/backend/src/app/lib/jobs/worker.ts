import { sql } from 'kysely';
import { Client } from 'pg';

import { env } from '../../../env';
import { logger } from '../../logger';
import { ImportsRepo } from '../../modules/imports/repositories/imports.repo';
import { executeJob } from './job-handlers';

// Backoff before polling again once the queue drained empty.
const IDLE_POLL_MS = 30000;

export class BackgroundJobWorker {
  private readonly importsRepo = new ImportsRepo();
  private readonly db = this.importsRepo.db; // Kysely DB instance

  // Number of jobs currently in flight (real concurrency), capped at maxConcurrency.
  private activeJobsCount = 0;
  private readonly maxConcurrency = env.workerConcurrency;
  private isRunning = false;
  // Epoch ms the next drain is scheduled for, so overlapping schedule requests coalesce to the
  // soonest one instead of stacking timers.
  private nextDrainAt = Number.POSITIVE_INFINITY;
  private pgClient: Client | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private recoveryInterval: NodeJS.Timeout | null = null;
  private shutdownResolver: (() => void) | null = null;
  private timer: NodeJS.Timeout | null = null;

  public start() {
    if (this.isRunning) return;
    this.isRunning = true;
    logger.info('Background Job Worker started.');

    this.ensureCleanupJobScheduled().catch((err) => logger.error({ err }, 'Failed to ensure cleanup job scheduled'));
    this.ensureSyncSchedulerJobScheduled().catch((err) =>
      logger.error({ err }, 'Failed to ensure sync scheduler job scheduled'),
    );
    this.ensureDuplicatesRecomputeJobScheduled().catch((err) =>
      logger.error({ err }, 'Failed to ensure duplicates recompute job scheduled'),
    );
    this.ensureAddressFingerprintsJobScheduled().catch((err) =>
      logger.error({ err }, 'Failed to ensure address fingerprints job scheduled'),
    );
    this.ensureWorkflowsJobScheduled().catch((err) =>
      logger.error({ err }, 'Failed to ensure workflows job scheduled'),
    );
    this.ensurePerformScheduledDeletionsJobScheduled().catch((err) =>
      logger.error({ err }, 'Failed to ensure perform scheduled deletions job scheduled'),
    );
    this.ensureUsageLimitChecksScheduled().catch((err) =>
      logger.error({ err }, 'Failed to ensure usage limit checks scheduled'),
    );
    this.ensureDueTasksCheckScheduled().catch((err) =>
      logger.error({ err }, 'Failed to ensure due tasks check scheduled'),
    );
    this.ensureCompaniesGoogleRefreshJobScheduled().catch((err) =>
      logger.error({ err }, 'Failed to ensure companies google refresh job scheduled'),
    );
    this.ensurePruneNewsletterEventsJobScheduled().catch((err) =>
      logger.error({ err }, 'Failed to ensure prune newsletter events job scheduled'),
    );
    this.ensurePruneRetentionJobScheduled().catch((err) =>
      logger.error({ err }, 'Failed to ensure retention prune job scheduled'),
    );

    // Run stale job recovery on startup and then every 5 minutes
    this.recoverStaleJobs().catch((err) => logger.error({ err }, 'Failed to recover stale jobs on startup'));
    this.recoveryInterval = setInterval(
      () => {
        this.recoverStaleJobs().catch((err) => logger.error({ err }, 'Failed to recover stale jobs'));
      },
      5 * 60 * 1000,
    );

    void this.setupListener();
    this.drain();
  }

  public async stop(): Promise<void> {
    this.isRunning = false;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
      this.nextDrainAt = Number.POSITIVE_INFINITY;
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
        logger.error({ err }, 'Error closing Postgres listener client on shutdown');
      }
      this.pgClient = null;
    }

    if (this.activeJobsCount > 0) {
      logger.info(
        `Background Job Worker: Waiting for ${this.activeJobsCount} active jobs to complete before shutting down...`,
      );
      await new Promise<void>((resolve) => {
        this.shutdownResolver = resolve;
      });
    }
    logger.info('Background Job Worker stopped.');
  }

  private async ensureAddressFingerprintsJobScheduled(): Promise<void> {
    try {
      await this.db.transaction().execute(async (trx) => {
        const existing = await trx
          .selectFrom('background_jobs')
          .select('id')
          .where('status', 'in', ['pending', 'processing'])
          .where(sql`payload->>'type'`, '=', 'recompute_address_fingerprints')
          .forUpdate()
          .executeTakeFirst();
        if (!existing) {
          logger.info('Scheduling nightly address fingerprints recomputation background job…');
          await trx
            .insertInto('background_jobs')
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
      logger.error({ err }, 'Failed to ensure address fingerprints job scheduled');
    }
  }

  private async ensureCleanupJobScheduled(): Promise<void> {
    try {
      await this.db.transaction().execute(async (trx) => {
        const existing = await trx
          .selectFrom('background_jobs')
          .select('id')
          .where('status', 'in', ['pending', 'processing'])
          .where(sql`payload->>'type'`, '=', 'cleanup_activities')
          .forUpdate()
          .executeTakeFirst();
        if (!existing) {
          logger.info('Scheduling daily activity feed cleanup background job…');
          await trx
            .insertInto('background_jobs')
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
      logger.error({ err }, 'Failed to ensure cleanup job scheduled');
    }
  }

  private async ensurePruneRetentionJobScheduled(): Promise<void> {
    try {
      await this.db.transaction().execute(async (trx) => {
        const existing = await trx
          .selectFrom('background_jobs')
          .select('id')
          .where('status', 'in', ['pending', 'processing'])
          .where(sql`payload->>'type'`, '=', 'prune_retention')
          .forUpdate()
          .executeTakeFirst();
        if (!existing) {
          logger.info('Scheduling daily retention prune background job…');
          await trx
            .insertInto('background_jobs')
            .values({
              tenant_id: null,
              queue: 'default',
              status: 'pending',
              payload: JSON.stringify({ type: 'prune_retention' }),
              run_at: new Date(),
              max_attempts: 3,
            })
            .execute();
        }
      });
    } catch (err) {
      logger.error({ err }, 'Failed to ensure retention prune job scheduled');
    }
  }

  private async ensureCompaniesGoogleRefreshJobScheduled(): Promise<void> {
    try {
      await this.db.transaction().execute(async (trx) => {
        const existing = await trx
          .selectFrom('background_jobs')
          .select('id')
          .where('status', 'in', ['pending', 'processing'])
          .where(sql`payload->>'type'`, '=', 'refresh_companies_google')
          .forUpdate()
          .executeTakeFirst();
        if (!existing) {
          logger.info('Scheduling daily company google enrichment background job…');
          await trx
            .insertInto('background_jobs')
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
      logger.error({ err }, 'Failed to ensure companies google refresh job scheduled');
    }
  }

  private async ensureDueTasksCheckScheduled(): Promise<void> {
    try {
      await this.db.transaction().execute(async (trx) => {
        const existing = await trx
          .selectFrom('background_jobs')
          .select('id')
          .where('status', 'in', ['pending', 'processing'])
          .where(sql`payload->>'type'`, '=', 'check_due_tasks')
          .forUpdate()
          .executeTakeFirst();
        if (!existing) {
          logger.info('Scheduling daily due tasks check background job…');
          await trx
            .insertInto('background_jobs')
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
      logger.error({ err }, 'Failed to ensure due tasks check scheduled');
    }
  }

  private async ensureDuplicatesRecomputeJobScheduled(): Promise<void> {
    try {
      await this.db.transaction().execute(async (trx) => {
        const existing = await trx
          .selectFrom('background_jobs')
          .select('id')
          .where('status', 'in', ['pending', 'processing'])
          .where(sql`payload->>'type'`, '=', 'recompute_all_duplicates')
          .forUpdate()
          .executeTakeFirst();
        if (!existing) {
          logger.info('Scheduling nightly duplicates recomputation background job…');
          await trx
            .insertInto('background_jobs')
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
      logger.error({ err }, 'Failed to ensure duplicates recompute job scheduled');
    }
  }

  private async ensurePerformScheduledDeletionsJobScheduled(): Promise<void> {
    try {
      await this.db.transaction().execute(async (trx) => {
        const existing = await trx
          .selectFrom('background_jobs')
          .select('id')
          .where('status', 'in', ['pending', 'processing'])
          .where(sql`payload->>'type'`, '=', 'perform_scheduled_deletions')
          .forUpdate()
          .executeTakeFirst();
        if (!existing) {
          logger.info('Scheduling daily scheduled deletions background job…');
          await trx
            .insertInto('background_jobs')
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
      logger.error({ err }, 'Failed to ensure perform scheduled deletions job scheduled');
    }
  }

  private async ensurePruneNewsletterEventsJobScheduled(): Promise<void> {
    try {
      await this.db.transaction().execute(async (trx) => {
        const existing = await trx
          .selectFrom('background_jobs')
          .select('id')
          .where('status', 'in', ['pending', 'processing'])
          .where(sql`payload->>'type'`, '=', 'prune_newsletter_events')
          .forUpdate()
          .executeTakeFirst();
        if (!existing) {
          logger.info('Scheduling daily newsletter events pruning background job…');
          await trx
            .insertInto('background_jobs')
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
      logger.error({ err }, 'Failed to ensure prune newsletter events job scheduled');
    }
  }

  private async ensureSyncSchedulerJobScheduled(): Promise<void> {
    try {
      await this.db.transaction().execute(async (trx) => {
        const existing = await trx
          .selectFrom('background_jobs')
          .select('id')
          .where('status', 'in', ['pending', 'processing'])
          .where(sql`payload->>'type'`, '=', 'schedule_sync_jobs')
          .forUpdate()
          .executeTakeFirst();
        if (!existing) {
          logger.info('Scheduling sync scheduler background job…');
          await trx
            .insertInto('background_jobs')
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
      logger.error({ err }, 'Failed to ensure sync scheduler job scheduled');
    }
  }

  private async ensureUsageLimitChecksScheduled(): Promise<void> {
    try {
      await this.db.transaction().execute(async (trx) => {
        const existing = await trx
          .selectFrom('background_jobs')
          .select('id')
          .where('status', 'in', ['pending', 'processing'])
          .where(sql`payload->>'type'`, '=', 'check_all_usage_limits')
          .forUpdate()
          .executeTakeFirst();
        if (!existing) {
          logger.info('Scheduling daily usage limits check background job…');
          await trx
            .insertInto('background_jobs')
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
      logger.error({ err }, 'Failed to ensure usage limit checks scheduled');
    }
  }

  private async ensureWorkflowsJobScheduled(): Promise<void> {
    try {
      await this.db.transaction().execute(async (trx) => {
        const existing = await trx
          .selectFrom('background_jobs')
          .select('id')
          .where('status', 'in', ['pending', 'processing'])
          .where(sql`payload->>'type'`, '=', 'process_drip_workflows')
          .forUpdate()
          .executeTakeFirst();
        if (!existing) {
          logger.info('Scheduling periodic drip workflows processing background job…');
          await trx
            .insertInto('background_jobs')
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
      logger.error({ err }, 'Failed to ensure workflows job scheduled');
    }
  }

  /**
   * Fill every free slot in the worker pool with a claimer. Each claimer runs one job (or finds the
   * queue empty) and, on completion, schedules the next drain — so the pool stays topped up to
   * `maxConcurrency` while there is work, and backs off when there isn't. Slot bookkeeping
   * (`activeJobsCount++`) happens synchronously here so we never launch past the cap.
   */
  private drain(): void {
    if (!this.isRunning) return;
    while (this.activeJobsCount < this.maxConcurrency) {
      this.activeJobsCount++;
      void this.processSlot();
    }
  }

  private async processSlot(): Promise<void> {
    let processedAJob = false;
    try {
      processedAJob = await this.processNextJob();
    } catch (err) {
      logger.error({ err }, 'Error in background job worker poll cycle');
    } finally {
      this.activeJobsCount--;

      // If shutdown was requested and no active jobs remain, resolve the stop() promise.
      if (!this.isRunning && this.activeJobsCount === 0 && this.shutdownResolver) {
        this.shutdownResolver();
      } else {
        // Look for more work immediately if we just processed a job (keep the pool full to drain the
        // queue), or back off if the queue was empty.
        this.scheduleDrain(processedAJob ? 0 : IDLE_POLL_MS);
      }
    }
  }

  /**
   * Schedule a drain in `ms`, coalescing with any already-pending drain: the soonest requested time
   * wins, so a just-finished slot's immediate re-poll supersedes an idle slot's long backoff.
   */
  private scheduleDrain(ms: number) {
    if (!this.isRunning) return;
    const fireAt = Date.now() + ms;
    if (this.timer && this.nextDrainAt <= fireAt) return; // a sooner (or equal) drain is already queued
    if (this.timer) clearTimeout(this.timer);
    this.nextDrainAt = fireAt;
    this.timer = setTimeout(() => {
      this.timer = null;
      this.nextDrainAt = Number.POSITIVE_INFINITY;
      this.drain();
    }, ms);
  }

  private async processNextJob(): Promise<boolean> {
    const workerId = `worker-${process.pid}-${Math.random().toString(36).slice(2, 9)}`;

    // Try to find and lock a job using SKIP LOCKED
    const job = await this.db.transaction().execute(async (trx) => {
      const pendingJob = await trx
        .selectFrom('background_jobs')
        .selectAll()
        .where('status', '=', 'pending')
        .where('run_at', '<=', new Date())
        .orderBy('id', 'asc')
        .limit(1)
        .forUpdate()
        .skipLocked()
        .executeTakeFirst();

      if (!pendingJob) return null;

      const updatedJob = await trx
        .updateTable('background_jobs')
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

    logger.info({ jobId: job.id, queue: job.queue }, 'Processing job');

    const payload = typeof job.payload === 'string' ? JSON.parse(job.payload) : job.payload;

    try {
      await executeJob(payload, this.db, job.id);

      // Mark job as completed
      await this.db
        .updateTable('background_jobs')
        .set({
          status: 'completed',
          locked_at: null,
          locked_by: null,
          updated_at: new Date(),
        })
        .where('id', '=', job.id)
        .execute();

      logger.info({ jobId: job.id }, 'Job completed successfully');
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      logger.error({ err, jobId: job.id }, 'Failed to process background job');

      try {
        // If it was an import job, mark the import as failed and store the error message
        if (payload.import_id) {
          await this.importsRepo.update({
            tenant_id: payload.tenant_id,
            id: payload.import_id,
            row: {
              status: 'failed',
              error_message: errorMsg.substring(0, 1000), // Truncate just in case
              processed_at: new Date(),
              updated_at: new Date(),
            },
          });
        }
      } catch (dbErr) {
        logger.error({ err: dbErr }, 'Failed to mark data_imports as failed');
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
        logger.info({ jobId: job.id, runAt: runAt.toISOString(), attempt: attempts, maxAttempts }, 'Rescheduling job');

        await this.db
          .updateTable('background_jobs')
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
        logger.error({ jobId: job.id, maxAttempts }, 'Job exceeded maximum attempts, marking as failed');
        await this.db
          .updateTable('background_jobs')
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
            logger.error({ err: exportErr }, 'Failed to update export status on job permanent failure');
          }
        }

        if (payload.type === 'ms_sync' && payload.userId) {
          const correlationId = Math.random().toString(36).slice(2, 10).toUpperCase();
          logger.error({ err, correlationId, userId: payload.userId }, 'MS sync permanently failed');
          try {
            const { MsOAuthService } = await import('../../modules/ms-sync/ms-oauth.service');
            const { env } = await import('../../../env');
            const oauthSvc = new MsOAuthService(this.db, {
              clientId: env.msClientId ?? '',
              clientSecret: env.msClientSecret ?? '',
              tenantId: env.msTenantId ?? 'common',
              redirectUri: env.msRedirectUri ?? `${env.apiUrl}/auth/ms/callback`,
            });
            await oauthSvc.recordSyncError(payload.userId, `Sync failed — support code: ${correlationId}`);
          } catch (recordErr) {
            logger.error({ err: recordErr }, 'Failed to record MS sync error on token');
          }
        }

        if (payload.type === 'google_sync' && payload.userId) {
          const correlationId = Math.random().toString(36).slice(2, 10).toUpperCase();
          logger.error({ err, correlationId, userId: payload.userId }, 'Google sync permanently failed');
          try {
            const { GoogleOAuthService } = await import('../../modules/google-sync/google-oauth.service');
            const { env } = await import('../../../env');
            const oauthSvc = new GoogleOAuthService(this.db, {
              clientId: env.googleClientId ?? '',
              clientSecret: env.googleClientSecret ?? '',
              redirectUri: env.googleRedirectUri ?? `${env.apiUrl}/auth/google/callback`,
            });
            await oauthSvc.recordSyncError(payload.userId, `Sync failed — support code: ${correlationId}`);
          } catch (recordErr) {
            logger.error({ err: recordErr }, 'Failed to record Google sync error on token');
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
      void this.pgClient.end().catch(() => {
        /* noop */
      });
      this.pgClient = null;
    }
    if (!this.isRunning) return;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => {
      void this.setupListener();
    }, 5000);
  }

  private async recoverStaleJobs(): Promise<void> {
    try {
      const staleTime = new Date(Date.now() - 30 * 60 * 1000); // 30 minutes
      await this.db
        .updateTable('background_jobs')
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
        .selectFrom('data_exports')
        .select(['id', 'tenant_id'])
        .where('status', 'in', ['pending', 'processing'])
        .where('created_at', '<', staleExportTime)
        .execute();

      if (staleExports.length > 0) {
        const ids = staleExports.map((e) => e.id);
        await this.db
          .updateTable('data_exports')
          .set({
            status: 'failed',
            error: 'Export processing timed out',
            updated_at: new Date(),
          })
          .where('id', 'in', ids)
          .execute();

        for (const exp of staleExports) {
          await this.db
            .deleteFrom('background_jobs')
            .where('tenant_id', '=', exp.tenant_id)
            .where(sql`payload->>'type'`, '=', 'export_csv')
            .where(sql`payload->>'export_id'`, '=', String(exp.id))
            .execute();
        }
      }
    } catch (err) {
      logger.error({ err }, 'Failed to recover stale background jobs');
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
    } else if (type === 'prune_retention') {
      delayMs = 24 * 60 * 60 * 1000;
    }

    if (delayMs > 0) {
      try {
        await this.db
          .insertInto('background_jobs')
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
        logger.error({ err: schedErr, type }, 'Failed to reschedule failed cron job');
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
          logger.debug('Background Job Worker received notify, waking up...');
          this.wakeUp();
        }
      });

      this.pgClient.on('error', (err) => {
        logger.error({ err }, 'Postgres listener client error');
        this.reconnectListener();
      });

      this.pgClient.on('end', () => {
        logger.warn('Postgres listener connection closed');
        this.reconnectListener();
      });

      await this.pgClient.query('LISTEN background_jobs_channel');
      logger.info('Listening for background_jobs notifications');
    } catch (err) {
      logger.error({ err }, 'Failed to setup Postgres listener');
      this.reconnectListener();
    }
  }

  private wakeUp() {
    // A NOTIFY means work may be waiting — drain the pool right away, superseding any idle backoff.
    this.scheduleDrain(0);
  }
}
