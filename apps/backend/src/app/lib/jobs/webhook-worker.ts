import { WebhookEventsRepo } from '../../modules/billing/repositories/webhook-events.repo';
import { BillingController } from '../../modules/billing/controller';

export class WebhookEventWorker {
  private isRunning = false;
  private timer: NodeJS.Timeout | null = null;
  private readonly webhookEventsRepo = new WebhookEventsRepo();
  private readonly db = this.webhookEventsRepo.db; // Kysely DB instance

  public start() {
    if (this.isRunning) return;
    this.isRunning = true;
    console.log('Webhook Event Worker started.');
    this.poll();
  }

  public stop() {
    this.isRunning = false;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    console.log('Webhook Event Worker stopped.');
  }

  private poll() {
    if (!this.isRunning) return;

    this.timer = setTimeout(async () => {
      try {
        await this.processNextEvent();
      } catch (err) {
        console.error('Error in webhook event worker poll cycle:', err);
      } finally {
        this.poll(); // Queue next poll cycle
      }
    }, 2000); // Poll every 2 seconds
  }

  private async processNextEvent(): Promise<void> {
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

    if (!eventRecord) return;

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
        // Retry with backoff (e.g. attempts * 30s delay)
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
  }
}
