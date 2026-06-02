import { StorageService } from '../storage.service';
import { PersonsService } from '../../modules/persons/services/persons.service';
import { DuplicateMaintenanceService } from '../../modules/persons/services/duplicate-maintenance.service';
import { ImportsRepo } from '../../modules/imports/repositories/imports.repo';
import { ListsController } from '../../modules/lists/controller';
import { ActivityController } from '../../modules/activity/controller';
import { GoogleOAuthService } from '../../modules/google-sync/google-oauth.service';
import { GoogleSyncService } from '../../modules/google-sync/google-sync.service';
import { MsOAuthService } from '../../modules/ms-sync/ms-oauth.service';
import { MsSyncService } from '../../modules/ms-sync/ms-sync.service';
import { env } from '../../../env';
import { sql } from 'kysely';

export class BackgroundJobWorker {
  private isRunning = false;
  private timer: NodeJS.Timeout | null = null;
  private readonly storageService = new StorageService();
  private readonly importsRepo = new ImportsRepo();
  private readonly db = this.importsRepo.db; // Kysely DB instance

  public start() {
    if (this.isRunning) return;
    this.isRunning = true;
    console.log('Background Job Worker started.');
    this.ensureCleanupJobScheduled().catch((err) =>
      console.error('Failed to ensure cleanup job scheduled:', err)
    );
    this.ensureSyncSchedulerJobScheduled().catch((err) =>
      console.error('Failed to ensure sync scheduler job scheduled:', err)
    );
    this.ensureDuplicatesRecomputeJobScheduled().catch((err) =>
      console.error('Failed to ensure duplicates recompute job scheduled:', err)
    );
    this.poll();
  }

  private async ensureSyncSchedulerJobScheduled(): Promise<void> {
    try {
      const existing = await this.db
        .selectFrom('background_jobs' as any)
        .select('id')
        .where('status', 'in', ['pending', 'processing'])
        .where(sql`payload->>'type'`, '=', 'schedule_sync_jobs')
        .executeTakeFirst();
      if (!existing) {
        console.log('Scheduling sync scheduler background job…');
        await this.db
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
    } catch (err) {
      console.error('Failed to ensure sync scheduler job scheduled:', err);
    }
  }

  private async queueUserSyncJobs(): Promise<void> {
    try {
      // Find all connected Google accounts
      const googleTokens = await this.db
        .selectFrom('google_oauth_tokens')
        .select(['user_id', 'tenant_id'])
        .execute();

      for (const token of googleTokens) {
        const userId = String(token.user_id);
        const tenantId = token.tenant_id ? String(token.tenant_id) : null;
        
        // Check if there is already a pending or processing sync job for this user
        const existing = await this.db
          .selectFrom('background_jobs' as any)
          .select('id')
          .where('status', 'in', ['pending', 'processing'])
          .where(sql`payload->>'type'`, '=', 'google_sync')
          .where(sql`payload->>'userId'`, '=', userId)
          .executeTakeFirst();

        if (!existing) {
          console.log(`Auto-scheduling Google sync job for user ${userId}`);
          await this.db
            .insertInto('background_jobs' as any)
            .values({
              tenant_id: tenantId as any,
              queue: 'default',
              status: 'pending',
              payload: JSON.stringify({
                type: 'google_sync',
                userId,
                tenantId,
                requestedBy: 'system',
              }),
              run_at: new Date(),
              max_attempts: 3,
            })
            .execute();
        }
      }

      // Find all connected Microsoft accounts
      const msTokens = await this.db
        .selectFrom('ms_oauth_tokens')
        .select(['user_id', 'tenant_id'])
        .execute();

      for (const token of msTokens) {
        const userId = String(token.user_id);
        const tenantId = token.tenant_id ? String(token.tenant_id) : null;

        // Check if there is already a pending or processing sync job for this user
        const existing = await this.db
          .selectFrom('background_jobs' as any)
          .select('id')
          .where('status', 'in', ['pending', 'processing'])
          .where(sql`payload->>'type'`, '=', 'ms_sync')
          .where(sql`payload->>'userId'`, '=', userId)
          .executeTakeFirst();

        if (!existing) {
          console.log(`Auto-scheduling MS sync job for user ${userId}`);
          await this.db
            .insertInto('background_jobs' as any)
            .values({
              tenant_id: tenantId as any,
              queue: 'default',
              status: 'pending',
              payload: JSON.stringify({
                type: 'ms_sync',
                userId,
                tenantId,
                requestedBy: 'system',
              }),
              run_at: new Date(),
              max_attempts: 3,
            })
            .execute();
        }
      }
    } catch (err) {
      console.error('Failed to queue user sync jobs:', err);
    }
  }

  private async ensureCleanupJobScheduled(): Promise<void> {
    try {
      const existing = await this.db
        .selectFrom('background_jobs' as any)
        .select('id')
        .where('status', 'in', ['pending', 'processing'])
        .where(sql`payload->>'type'`, '=', 'cleanup_activities')
        .executeTakeFirst();
      if (!existing) {
        console.log('Scheduling daily activity feed cleanup background job…');
        await this.db
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
    } catch (err) {
      console.error('Failed to ensure cleanup job scheduled:', err);
    }
  }

  private async ensureDuplicatesRecomputeJobScheduled(): Promise<void> {
    try {
      const existing = await this.db
        .selectFrom('background_jobs' as any)
        .select('id')
        .where('status', 'in', ['pending', 'processing'])
        .where(sql`payload->>'type'`, '=', 'recompute_all_duplicates')
        .executeTakeFirst();
      if (!existing) {
        console.log('Scheduling nightly duplicates recomputation background job…');
        await this.db
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
    } catch (err) {
      console.error('Failed to ensure duplicates recompute job scheduled:', err);
    }
  }

  public stop() {
    this.isRunning = false;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    console.log('Background Job Worker stopped.');
  }

  private poll() {
    if (!this.isRunning) return;

    this.timer = setTimeout(async () => {
      try {
        await this.processNextJob();
      } catch (err) {
        console.error('Error in background job worker poll cycle:', err);
      } finally {
        this.poll(); // Queue next poll cycle
      }
    }, 2000); // Poll every 2 seconds
  }

  private async processNextJob(): Promise<void> {
    const workerId = `worker-${process.pid}-${Math.random().toString(36).slice(2, 9)}`;

    // Try to find and lock a job using SKIP LOCKED
    const job = await this.db.transaction().execute(async (trx: any) => {
      const pendingJob = await trx
        .selectFrom('background_jobs' as any)
        .selectAll()
        .where('status', '=', 'pending')
        .where('run_at', '<=', new Date())
        .orderBy('id', 'asc')
        .limit(1)
        .forUpdate()
        .skipLocked()
        .executeTakeFirst() as any;

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

    if (!job) return;

    console.log(`Processing job ${job.id} (Queue: ${job.queue}, Status: ${job.status})`);

    const payload = typeof job.payload === 'string' ? JSON.parse(job.payload) : job.payload;

    try {
      if (payload.type === 'refresh_list') {
        const listsController = new ListsController();
        await listsController.executeListRefresh(payload.tenant_id, payload.list_id, payload.user_id);
      } else if (payload.type === 'cleanup_activities') {
        const activityController = new ActivityController();
        await activityController.deleteOldActivities();

        // Schedule next cleanup_activities job 24 hours later
        await this.db.insertInto('background_jobs' as any)
          .values({
            tenant_id: null,
            queue: 'default',
            status: 'pending',
            payload: JSON.stringify({ type: 'cleanup_activities' }),
            run_at: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours later
            max_attempts: 3,
          })
          .execute();
      } else if (payload.type === 'schedule_sync_jobs') {
        await this.queueUserSyncJobs();

        // Schedule next schedule_sync_jobs job 10 minutes later
        await this.db.insertInto('background_jobs' as any)
          .values({
            tenant_id: null,
            queue: 'default',
            status: 'pending',
            payload: JSON.stringify({ type: 'schedule_sync_jobs' }),
            run_at: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes later
            max_attempts: 3,
          })
          .execute();
      } else if (payload.type === 'google_sync') {
        const oauthSvc = new GoogleOAuthService(this.db as any, {
          clientId: env.googleClientId ?? '',
          clientSecret: env.googleClientSecret ?? '',
          redirectUri: env.googleRedirectUri ?? `${env.apiUrl}/auth/google/callback`,
        });
        const syncSvc = new GoogleSyncService(this.db as any, oauthSvc);
        await syncSvc.syncUser(payload.userId, payload.tenantId, payload.requestedBy);
      } else if (payload.type === 'ms_sync') {
        const oauthSvc = new MsOAuthService(this.db as any, {
          clientId: env.msClientId ?? '',
          clientSecret: env.msClientSecret ?? '',
          tenantId: env.msTenantId ?? 'common',
          redirectUri: env.msRedirectUri ?? `${env.apiUrl}/auth/ms/callback`,
        });
        const syncSvc = new MsSyncService(this.db as any, oauthSvc);
        await syncSvc.syncUser(payload.userId, payload.tenantId, payload.requestedBy);
      } else if (payload.type === 'potential_duplicates_maintenance') {
        const maintenanceSvc = new DuplicateMaintenanceService();
        await maintenanceSvc.runMaintenance(
          payload.tenant_id,
          payload.person_ids || [],
          payload.group_keys || []
        );
      } else if (payload.type === 'recompute_all_duplicates') {
        const tenants = await this.db
          .selectFrom('tenants')
          .select('id')
          .execute();

        const maintenanceSvc = new DuplicateMaintenanceService();
        for (const tenant of tenants) {
          try {
            await maintenanceSvc.recomputeAllDuplicates(String(tenant.id));
          } catch (tenantErr) {
            console.error(`Failed to recompute duplicates for tenant ${tenant.id}:`, tenantErr);
          }
        }

        await this.db.insertInto('background_jobs' as any)
          .values({
            tenant_id: null,
            queue: 'default',
            status: 'pending',
            payload: JSON.stringify({ type: 'recompute_all_duplicates' }),
            run_at: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours later
            max_attempts: 3,
          })
          .execute();
      } else if (payload.import_id && payload.storage_key) {
        // 1. Mark import status as 'processing' in data_imports
        await this.importsRepo.update({
          tenant_id: payload.tenant_id as any,
          id: payload.import_id as any,
          row: {
            status: 'processing',
            updated_at: new Date(),
          } as any,
        });

        // 2. Download mapping payload from storage
        const buffer = await this.storageService.download(payload.storage_key);
        const rows = JSON.parse(buffer.toString('utf8'));

        // 3. Process the import rows in chunks
        const personsService = new PersonsService();
        await personsService.processImportRows(
          payload.import_id,
          payload.tenant_id,
          payload.user_id,
          payload.campaign_id,
          payload.tags || [],
          Number(payload.skipped || 0),
          rows,
        );

        // 4. Update import status to 'completed'
        await this.importsRepo.update({
          tenant_id: payload.tenant_id as any,
          id: payload.import_id as any,
          row: {
            status: 'completed',
            processed_at: new Date(),
            updated_at: new Date(),
          } as any,
        });

        // 5. Clean up temporary payload file from storage
        try {
          await this.storageService.delete(payload.storage_key);
        } catch (storageErr) {
          console.error(`Failed to clean up storage key ${payload.storage_key}:`, storageErr);
        }
      }

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
        // Retry with backoff (e.g. attempts * 30s delay)
        const delaySeconds = attempts * 30;
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

        // If the cleanup activities job failed permanently, schedule the next one for the next day
        if (payload.type === 'cleanup_activities') {
          try {
            await this.db.insertInto('background_jobs' as any)
              .values({
                tenant_id: null,
                queue: 'default',
                status: 'pending',
                payload: JSON.stringify({ type: 'cleanup_activities' }),
                run_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
                max_attempts: 3,
              })
              .execute();
          } catch (schedErr) {
            console.error('Failed to reschedule failed cleanup job:', schedErr);
          }
        } else if (payload.type === 'schedule_sync_jobs') {
          try {
            await this.db.insertInto('background_jobs' as any)
              .values({
                tenant_id: null,
                queue: 'default',
                status: 'pending',
                payload: JSON.stringify({ type: 'schedule_sync_jobs' }),
                run_at: new Date(Date.now() + 10 * 60 * 1000),
                max_attempts: 3,
              })
              .execute();
          } catch (schedErr) {
            console.error('Failed to reschedule failed sync scheduler job:', schedErr);
          }
        } else if (payload.type === 'recompute_all_duplicates') {
          try {
            await this.db.insertInto('background_jobs' as any)
              .values({
                tenant_id: null,
                queue: 'default',
                status: 'pending',
                payload: JSON.stringify({ type: 'recompute_all_duplicates' }),
                run_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
                max_attempts: 3,
              })
              .execute();
          } catch (schedErr) {
            console.error('Failed to reschedule failed duplicates recompute job:', schedErr);
          }
        }
      }
    }
  }
}
