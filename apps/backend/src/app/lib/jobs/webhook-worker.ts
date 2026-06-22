import { WebhookEventsRepo } from '../../modules/billing/repositories/webhook-events.repo';
import { BillingController } from '../../modules/billing/controller';
import { DonationsController } from '../../modules/donations/controller';
import { Client } from 'pg';
import { env } from '../../../env';

export class WebhookEventWorker {
  private isRunning = false;
  private timer: NodeJS.Timeout | null = null;
  private activeJobsCount = 0;
  private shutdownResolver: (() => void) | null = null;
  private pgClient: Client | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;

  private readonly webhookEventsRepo = new WebhookEventsRepo();
  private readonly db = this.webhookEventsRepo.db; // Kysely DB instance

  public start() {
    if (this.isRunning) return;
    this.isRunning = true;
    console.log('Webhook Event Worker started.');
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
        `Webhook Event Worker: Waiting for ${this.activeJobsCount} active events to process before shutting down...`,
      );
      await new Promise<void>((resolve) => {
        this.shutdownResolver = resolve;
      });
    }
    console.log('Webhook Event Worker stopped.');
  }

  private async setupListener() {
    if (!this.isRunning) return;
    try {
      this.pgClient = new Client(env.db);
      await this.pgClient.connect();

      this.pgClient.on('notification', (msg) => {
        if (msg.channel === 'webhook_events_channel') {
          console.log('Webhook Event Worker received notify, waking up...');
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

      await this.pgClient.query('LISTEN webhook_events_channel');
      console.log('Listening for webhook_events notifications...');
    } catch (err) {
      console.error('Failed to setup Postgres listener:', err);
      this.reconnectListener();
    }
  }

  private reconnectListener() {
    if (this.pgClient) {
      this.pgClient.end().catch(() => {});
      this.pgClient = null;
    }
    if (!this.isRunning) return;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => {
      this.setupListener();
    }, 5000);
  }

  private wakeUp() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.poll();
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
        // or back off to 30 seconds if no events were found.
        const delay = processedAnEvent ? 10 : 30000;
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
      const pendingEvent = (await trx
        .selectFrom('webhook_events' as any)
        .selectAll()
        .where('status', '=', 'pending')
        .where('run_at', '<=', new Date())
        .orderBy('id', 'asc')
        .limit(1)
        .forUpdate()
        .skipLocked()
        .executeTakeFirst()) as any;

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

    console.log(
      `Processing webhook event ${eventRecord.id} (Stripe Event: ${eventRecord.stripe_event_id}, Type: ${eventRecord.type})`,
    );

    const payload = typeof eventRecord.payload === 'string' ? JSON.parse(eventRecord.payload) : eventRecord.payload;

    try {
      const stripeObj = payload.data?.object;
      const eventType: string = payload.type;

      // Helper to resolve an admin userId for the tenant
      const resolveUserId = async (tenantId: string, metaUserId: string | null): Promise<string> => {
        if (metaUserId) return metaUserId;
        const tenantRow = await this.db
          .selectFrom('tenants')
          .select('admin_id')
          .where('id', '=', tenantId as any)
          .executeTakeFirst();
        if (!tenantRow?.admin_id) throw new Error(`Tenant ${tenantId} has no admin_id.`);
        return String(tenantRow.admin_id);
      };

      const isOneTimeDonation = eventType === 'checkout.session.completed' && stripeObj?.metadata?.personId && stripeObj?.metadata?.isRecurring !== 'true';
      const isRecurringCheckoutComplete = eventType === 'checkout.session.completed' && stripeObj?.metadata?.personId && stripeObj?.metadata?.isRecurring === 'true';
      const isInvoicePaid = eventType === 'invoice.payment_succeeded' && stripeObj?.subscription;
      const isSubscriptionUpdated = eventType === 'customer.subscription.updated';
      const isSubscriptionDeleted = eventType === 'customer.subscription.deleted';
      const isInvoiceFailed = eventType === 'invoice.payment_failed' && stripeObj?.subscription;

      if (isOneTimeDonation) {
        // Standard one-time donation via checkout.session.completed
        const donationsController = new DonationsController();
        const tenantId = String(stripeObj.metadata.tenantId);
        const personId = String(stripeObj.metadata.personId);
        const amountCents = Number(stripeObj.metadata.amount);
        const province = String(stripeObj.metadata.residencyProvince || '');
        const country = String(stripeObj.metadata.residencyCountry || '');
        const sessionId = String(stripeObj.id);
        const createdBy = await resolveUserId(tenantId, stripeObj.metadata.createdBy || null);

        await donationsController.recordSuccessfulDonation(tenantId, personId, amountCents, sessionId, province, country, createdBy);

      } else if (isRecurringCheckoutComplete) {
        // Subscription checkout completed — create the pledge record.
        // The first invoice payment is handled separately by invoice.payment_succeeded.
        const donationsController = new DonationsController();
        const tenantId = String(stripeObj.metadata.tenantId);
        const personId = String(stripeObj.metadata.personId);
        const monthlyAmountCents = Number(stripeObj.metadata.monthlyAmount);
        const province = String(stripeObj.metadata.residencyProvince || '');
        const country = String(stripeObj.metadata.residencyCountry || '');
        const createdBy = await resolveUserId(tenantId, stripeObj.metadata.createdBy || null);
        const subscriptionId = String(stripeObj.subscription || '');
        const customerId = stripeObj.customer ? String(stripeObj.customer) : null;

        if (subscriptionId) {
          await donationsController.recordNewPledge(tenantId, personId, monthlyAmountCents, subscriptionId, customerId, province, country, createdBy);
        }

      } else if (isInvoicePaid) {
        // A subscription invoice was paid — record it as a donation installment.
        const donationsController = new DonationsController();
        const subscriptionId = String(stripeObj.subscription);
        const invoiceId = String(stripeObj.id);
        const amountPaidCents = Number(stripeObj.amount_paid || 0);

        const pledge = await this.db
          .selectFrom('donation_pledges' as any)
          .selectAll()
          .where('stripe_subscription_id', '=', subscriptionId)
          .executeTakeFirst() as any;

        if (pledge && amountPaidCents > 0) {
          // Avoid duplicate recording (invoice id as session id key)
          const alreadyRecorded = await this.db
            .selectFrom('donations' as any)
            .select('id')
            .where('stripe_session_id', '=', invoiceId)
            .executeTakeFirst();

          if (!alreadyRecorded) {
            const createdBy = await resolveUserId(String(pledge.tenant_id), null);
            await donationsController.recordSuccessfulDonation(
              String(pledge.tenant_id),
              String(pledge.person_id),
              amountPaidCents,
              invoiceId,
              pledge.state || '',
              pledge.country || '',
              createdBy,
              String(pledge.id),
            );
          }
        }

      } else if (isSubscriptionUpdated) {
        // Sync pledge status from Stripe subscription status
        const subscriptionId = String(stripeObj.id);
        const stripeStatus: string = stripeObj.status;
        const statusMap: Record<string, string> = {
          active: 'active',
          past_due: 'past_due',
          canceled: 'cancelled',
          unpaid: 'unpaid',
        };
        const mappedStatus = statusMap[stripeStatus];
        const nextBillingDate = stripeObj.current_period_end
          ? new Date(stripeObj.current_period_end * 1000).toISOString().slice(0, 10)
          : null;

        if (mappedStatus) {
          await this.db
            .updateTable('donation_pledges' as any)
            .set({
              status: mappedStatus,
              next_billing_date: nextBillingDate,
              cancelled_at: mappedStatus === 'cancelled' ? new Date() : null,
              updated_at: new Date(),
            })
            .where('stripe_subscription_id', '=', subscriptionId)
            .execute();
        }

      } else if (isSubscriptionDeleted) {
        const subscriptionId = String(stripeObj.id);
        await this.db
          .updateTable('donation_pledges' as any)
          .set({ status: 'cancelled', cancelled_at: new Date(), updated_at: new Date() })
          .where('stripe_subscription_id', '=', subscriptionId)
          .execute();

      } else if (isInvoiceFailed) {
        const subscriptionId = String(stripeObj.subscription);
        await this.db
          .updateTable('donation_pledges' as any)
          .set({ status: 'past_due', updated_at: new Date() })
          .where('stripe_subscription_id', '=', subscriptionId)
          .execute();

      } else {
        const billingController = new BillingController();
        await billingController.processWebhookEvent(payload);
      }

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
        console.log(
          `Rescheduling webhook event ${eventRecord.id} to run at ${runAt.toISOString()} (Attempt ${attempts}/${maxAttempts})`,
        );

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
