import { WebhookEventsRepo } from '../../modules/billing/repositories/webhook-events.repo';
import { BillingController } from '../../modules/billing/controller';

export class WebhookEventWorker {
  private isRunning = false;
  private timer: NodeJS.Timeout | null = null;
  private activeJobsCount = 0;
  private shutdownResolver: (() => void) | null = null;

  private readonly webhookEventsRepo = new WebhookEventsRepo();
  private readonly db = this.webhookEventsRepo.db; // Kysely DB instance

  public start() {
    if (this.isRunning) return;
    this.isRunning = true;
    console.log('Webhook Event Worker started.');
    this.poll();
  }

  public async stop(): Promise<void> {
    this.isRunning = false;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    if (this.activeJobsCount > 0) {
      console.log(`Webhook Event Worker: Waiting for ${this.activeJobsCount} active events to process before shutting down...`);
      await new Promise<void>((resolve) => {
        this.shutdownResolver = resolve;
      });
    }
    console.log('Webhook Event Worker stopped.');
  }

  private poll() {
    if (!this.isRunning) return;

    this.timer = setTimeout(async () => {
      let processedAnEvent = false;
      try {
        this.activeJobsCount++;
        processedAnEvent = await this.processNextEvent();
      } catch (err) {
        console.error('Error in webhook event worker poll cycle:', err);
      } finally {
        this.activeJobsCount--;

        // If shutdown was requested and no active jobs remain, resolve the stop() promise
        if (!this.isRunning && this.activeJobsCount === 0 && this.shutdownResolver) {
          this.shutdownResolver();
          return;
        }

        // Poll again immediately (10ms) if an event was processed to drain the queue quickly,
        // otherwise back off to 2 seconds.
        const delay = processedAnEvent ? 10 : 2000;
        this.pollWithDelay(delay);
      }
    }, 0);
  }

  private pollWithDelay(ms: number) {
    if (!this.isRunning) return;
    this.timer = setTimeout(() => this.poll(), ms);
  }

  private async processNextEvent(): Promise<boolean> {
    const workerId = `webhook-worker-${process.pid}-${Math.random().toString(36).slice(2, 9)}`;

    // Try to find and lock a webhook event using SKIP LOCKED
    const eventRecord = await this.db.transaction().execute(async (trx: any) => {
      const pendingEvent = await trx
        .selectFrom('webhook_events' as any)
        .selectAll()
        .where('status', '=', 'pending')
        .where('run_at', '<=', new Date())
        .orderBy('id', 'asc')
        .limit(1)
        .forUpdate()
        .skipLocked()
        .executeTakeFirst() as any;

      if (!pendingEvent) return null;

      const updatedEvent = await trx
        .updateTable('webhook_events' as any)
        .set({
          status: 'processing',
          locked_at: new Date(),
          locked_by: workerId,
          attempts: Number(pendingEvent.attempts || 0) + 1,
          updated_at: new Date(),
        })
        .where('id', '=', pendingEvent.id)
        .returningAll()
        .executeTakeFirst();

      return updatedEvent;
    });

    if (!eventRecord) return false;

    console.log(`Processing webhook event ${eventRecord.id} (Stripe Event: ${eventRecord.stripe_event_id}, Type: ${eventRecord.type})`);

    const payload = typeof eventRecord.payload === 'string' ? JSON.parse(eventRecord.payload) : eventRecord.payload;

    try {
      const billingController = new BillingController();
      await billingController.processWebhookEvent(payload);

      // Mark event as processed/completed
      await this.db
        .updateTable('webhook_events' as any)
        .set({
          status: 'processed',
          locked_at: null,
          locked_by: null,
          processed_at: new Date(),
          updated_at: new Date(),
        })
        .where('id', '=', eventRecord.id)
        .execute();

      console.log(`Webhook event ${eventRecord.id} completed successfully.`);
    } catch (err: any) {
      const errorMsg = err?.message || String(err);
      console.error(`Failed to process webhook event ${eventRecord.id}:`, err);

      const attempts = Number(eventRecord.attempts || 0);
      const maxAttempts = Number(eventRecord.max_attempts || 3);

      if (attempts < maxAttempts) {
        // Retry with backoff (attempts * 30s delay)
        const delaySeconds = attempts * 30;
        const runAt = new Date(Date.now() + delaySeconds * 1000);
        console.log(`Rescheduling webhook event ${eventRecord.id} to run at ${runAt.toISOString()} (Attempt ${attempts}/${maxAttempts})`);

        await this.db
          .updateTable('webhook_events' as any)
          .set({
            status: 'pending',
            locked_at: null,
            locked_by: null,
            error: errorMsg,
            run_at: runAt,
            updated_at: new Date(),
          })
          .where('id', '=', eventRecord.id)
          .execute();
      } else {
        console.error(`Webhook event ${eventRecord.id} exceeded maximum attempts (${maxAttempts}). Marking as failed.`);
        await this.db
          .updateTable('webhook_events' as any)
          .set({
            status: 'failed',
            locked_at: null,
            locked_by: null,
            error: errorMsg,
            updated_at: new Date(),
          })
          .where('id', '=', eventRecord.id)
          .execute();
      }
    }

    return true;
  }
}
