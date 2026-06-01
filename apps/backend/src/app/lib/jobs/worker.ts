import { StorageService } from '../storage.service';
import { PersonsService } from '../../modules/persons/services/persons.service';
import { ImportsRepo } from '../../modules/imports/repositories/imports.repo';
import { ListsController } from '../../modules/lists/controller';

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
    this.poll();
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
      }
    }
  }
}
