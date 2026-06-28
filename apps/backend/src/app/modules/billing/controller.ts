import Stripe from 'stripe';
import { env } from '../../../env';
import { TenantsRepo } from '../auth/repositories/tenants.repo';
import { TransactionalEmailService } from '../../lib/mail/transactional-mail.service';
import { WebhookEventsRepo } from './repositories/webhook-events.repo';
import { WorkflowsController } from '../workflows/controller';
import { sql } from 'kysely';
import { getPlanLimits } from './usage-limits';

const isMockMode = !env.stripeSecretKey || env.stripeSecretKey.includes('MockKey');
const stripe = isMockMode ? null : new Stripe(env.stripeSecretKey!);
const tenantsRepo = new TenantsRepo();
const webhookEventsRepo = new WebhookEventsRepo();

export class BillingController {
  constructor() {
    if (isMockMode) {
      console.log('💳 [BillingController] Running in Mock Mode (no Stripe secret key provided)');
    }
  }

  private getFrontendUrl(): string {
    return env.apiUrl.replace(':3000', ':4200'); // standard dev replace, or env.apiUrl in prod
  }

  public async getBillingDetails(auth: { tenant_id: string }) {
    const tenant = (await tenantsRepo.getOneBy('id', {
      tenant_id: auth.tenant_id,
      value: auth.tenant_id,
    })) as any;

    if (!tenant) {
      throw new Error('Tenant not found');
    }

    return {
      plan: tenant.subscription_plan || 'free',
      status: tenant.subscription_status || 'inactive',
      endsAt: tenant.subscription_ends_at ? new Date(tenant.subscription_ends_at) : null,
      stripeCustomerId: tenant.stripe_customer_id || null,
      stripeSubscriptionId: tenant.stripe_subscription_id || null,
      hasActiveSubscription: ['active', 'trialing'].includes(tenant.subscription_status || ''),
      isMockMode,
    };
  }

  public async createCheckoutSession(
    auth: { tenant_id: string; user_id: string },
    plan: 'grassroots' | 'representative',
  ) {
    const tenant = (await tenantsRepo.getOneBy('id', {
      tenant_id: auth.tenant_id,
      value: auth.tenant_id,
    })) as any;

    if (!tenant) {
      throw new Error('Tenant not found');
    }

    const frontendUrl = this.getFrontendUrl();

    if (isMockMode) {
      // In Mock Mode, direct them to a simulated callback
      const mockSuccessUrl = `${frontendUrl}/settings?tab=billing&mock_checkout_success=true&plan=${plan}`;
      return { url: mockSuccessUrl };
    }

    // Live Stripe Mode
    let stripeCustomerId = tenant.stripe_customer_id;
    if (!stripeCustomerId) {
      const customer = await stripe!.customers.create({
        email: tenant.email || undefined,
        name: tenant.name,
        metadata: {
          tenantId: auth.tenant_id,
        },
      });
      stripeCustomerId = customer.id;

      // Update tenant in DB with customer ID
      await tenantsRepo.update({
        tenant_id: auth.tenant_id,
        id: auth.tenant_id,
        row: { stripe_customer_id: stripeCustomerId } as any,
      });
    }

    // Determine Stripe Price ID
    const priceId = plan === 'grassroots' ? env.stripePlanGrassrootsPriceId : env.stripePlanRepresentativePriceId;

    if (!priceId) {
      throw new Error(`Stripe Price ID is not configured for plan: ${plan}`);
    }

    const session = await stripe!.checkout.sessions.create({
      customer: stripeCustomerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${frontendUrl}/settings?tab=billing&checkout_success=true`,
      cancel_url: `${frontendUrl}/settings?tab=billing`,
      subscription_data: {
        metadata: {
          tenantId: auth.tenant_id,
        },
      },
      metadata: {
        tenantId: auth.tenant_id,
      },
    });

    return { url: session.url };
  }

  public async createPortalSession(auth: { tenant_id: string }) {
    const tenant = (await tenantsRepo.getOneBy('id', {
      tenant_id: auth.tenant_id,
      value: auth.tenant_id,
    })) as any;

    if (!tenant) {
      throw new Error('Tenant not found');
    }

    const frontendUrl = this.getFrontendUrl();

    if (isMockMode) {
      return { url: `${frontendUrl}/settings?tab=billing&mock_portal_success=true` };
    }

    const stripeCustomerId = tenant.stripe_customer_id;
    if (!stripeCustomerId) {
      throw new Error('No active billing history found. Please subscribe to a plan first.');
    }

    const session = await stripe!.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: `${frontendUrl}/settings?tab=billing`,
    });

    return { url: session.url };
  }

  public async handleWebhook(payload: string, signature: string) {
    if (isMockMode || !stripe || !env.stripeWebhookSecret) {
      console.log('💳 [BillingController] Webhook received, but ignored due to mock mode or missing secret');
      return;
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(payload, signature, env.stripeWebhookSecret);
    } catch (err: any) {
      console.error(`⚠️ Webhook signature verification failed: ${err.message}`);
      throw new Error(`Webhook Error: ${err.message}`);
    }

    console.log(`💳 Persisting webhook event: ${event.id} (${event.type})`);

    // Persist event for background worker processing.
    // Handles idempotency: duplicate events will trigger unique constraint
    // violation on `stripe_event_id` and be ignored, returning 200 OK.
    await webhookEventsRepo.db
      .insertInto('webhook_events')
      .values({
        stripe_event_id: event.id,
        type: event.type,
        payload: JSON.stringify(event),
        status: 'pending',
      })
      .onConflict((oc: any) => oc.column('stripe_event_id').doNothing())
      .execute();
  }

  public async processWebhookEvent(event: Stripe.Event) {
    console.log(`💳 Processing webhook event: ${event.id} (${event.type})`);

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const tenantId = session.metadata?.['tenantId'];
        const subscriptionId = session.subscription as string;
        const customerId = session.customer as string;

        if (tenantId && subscriptionId) {
          const subscription = (await stripe!.subscriptions.retrieve(subscriptionId)) as any;
          const priceId = subscription.items.data[0]?.price.id;

          let planName = 'free';
          if (priceId === env.stripePlanGrassrootsPriceId) planName = 'grassroots';
          else if (priceId === env.stripePlanRepresentativePriceId) planName = 'representative';

          await tenantsRepo.update({
            tenant_id: tenantId,
            id: tenantId,
            row: {
              stripe_customer_id: customerId,
              stripe_subscription_id: subscriptionId,
              subscription_plan: planName,
              subscription_status: subscription.status,
              subscription_ends_at: new Date(subscription.current_period_end * 1000).toISOString(),
            } as any,
          });
          console.log(`💳 Plan activated successfully for Tenant ID: ${tenantId}`);
          try {
            await this.handleSubscriptionChange(tenantId, planName);
          } catch (mailErr) {
            console.error('Failed to send subscription changed email on checkout.session.completed:', mailErr);
          }
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const subscriptionId = subscription.id;
        const customerId = subscription.customer as string;

        // Search Kysely database for the tenant with matching customer id
        const dbTenant = (await tenantsRepo.getOneBy('stripe_customer_id', {
          tenant_id: '1' as any,
          value: customerId,
        })) as any;

        if (dbTenant) {
          const priceId = subscription.items.data[0]?.price.id;
          let planName = dbTenant.subscription_plan;
          if (priceId === env.stripePlanGrassrootsPriceId) planName = 'grassroots';
          else if (priceId === env.stripePlanRepresentativePriceId) planName = 'representative';

          await tenantsRepo.update({
            tenant_id: dbTenant.id,
            id: dbTenant.id,
            row: {
              stripe_subscription_id: subscriptionId,
              subscription_plan: planName,
              subscription_status: subscription.status,
              subscription_ends_at: new Date((subscription as any).current_period_end * 1000).toISOString(),
            } as any,
          });
          console.log(`💳 Subscription updated for Tenant ID: ${dbTenant.id}`);
          try {
            await this.handleSubscriptionChange(dbTenant.id, planName);
          } catch (mailErr) {
            console.error('Failed to send subscription changed email on customer.subscription.updated:', mailErr);
          }
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        const dbTenant = (await tenantsRepo.getOneBy('stripe_customer_id', {
          tenant_id: '1' as any,
          value: customerId,
        })) as any;

        if (dbTenant) {
          await tenantsRepo.update({
            tenant_id: dbTenant.id,
            id: dbTenant.id,
            row: {
              subscription_status: 'canceled',
              subscription_plan: 'free',
              subscription_ends_at: new Date().toISOString(),
            } as any,
          });
          console.log(`💳 Subscription canceled for Tenant ID: ${dbTenant.id}`);
          try {
            await this.handleSubscriptionChange(dbTenant.id, 'free');
          } catch (mailErr) {
            console.error('Failed to send subscription cancellation email on customer.subscription.deleted:', mailErr);
          }
        }
        break;
      }

      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;
        const dbTenant = (await tenantsRepo.getOneBy('stripe_customer_id', {
          tenant_id: '1' as any,
          value: customerId,
        })) as any;

        if (dbTenant) {
          const admin = await tenantsRepo.db
            .selectFrom('authusers')
            .select(['email', 'first_name'])
            .where('id', '=', dbTenant.admin_id)
            .executeTakeFirst();

          if (admin && admin.email) {
            // Find person matching admin email
            const person = await tenantsRepo.db
              .selectFrom('persons')
              .select('id')
              .where('tenant_id', '=', dbTenant.id)
              .where(sql`lower(email)`, '=', admin.email.toLowerCase())
              .executeTakeFirst();
            if (person) {
              try {
                const workflowsController = new WorkflowsController();
                await workflowsController.triggerWorkflow(dbTenant.id, String(person.id), 'payment_event', event.type);
              } catch (err) {
                console.error('Failed to trigger billing workflow on invoice.paid:', err);
              }
            }

            const mailService = new TransactionalEmailService();
            const amountPaid = invoice.amount_paid / 100;
            const pdfUrl = invoice.hosted_invoice_url || '';

            // Build charges summary
            let summaryOfCharges = '';
            let summaryOfChargesHtml = '';
            if (invoice.lines && Array.isArray(invoice.lines.data)) {
              summaryOfCharges =
                '\nSummary of Charges:\n' +
                invoice.lines.data
                  .map((line) => {
                    const lineAmt = (line.amount || 0) / 100;
                    return `- ${line.description || 'Subscription item'}: $${lineAmt.toFixed(2)}${line.quantity ? ` (Qty: ${line.quantity})` : ''}`;
                  })
                  .join('\n');

              summaryOfChargesHtml =
                '<p><strong>Summary of Charges:</strong></p><ul>' +
                invoice.lines.data
                  .map((line) => {
                    const lineAmt = (line.amount || 0) / 100;
                    return `<li><strong>${line.description || 'Subscription item'}</strong>: $${lineAmt.toFixed(2)}${line.quantity ? ` (Qty: ${line.quantity})` : ''}</li>`;
                  })
                  .join('') +
                '</ul>';
            }

            await mailService.sendMail({
              to: admin.email,
              subject: `Receipt for your CampaignRaven Subscription`,
              text: `Hi ${admin.first_name || 'Admin'},\n\nThis is a receipt confirming your subscription payment of $${amountPaid.toFixed(2)} was successfully processed.\n\n${summaryOfCharges}\n\nView invoice: ${pdfUrl}`,
              html: `<p>Hi ${admin.first_name || 'Admin'},</p><p>This is a receipt confirming your subscription payment of <strong>$${amountPaid.toFixed(2)}</strong> was successfully processed.</p>${summaryOfChargesHtml}<p><a href="${pdfUrl}">View/Download Invoice Receipt</a></p>`,
            });
          }
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;
        const dbTenant = (await tenantsRepo.getOneBy('stripe_customer_id', {
          tenant_id: '1' as any,
          value: customerId,
        })) as any;

        if (dbTenant) {
          const admin = await tenantsRepo.db
            .selectFrom('authusers')
            .select(['email', 'first_name'])
            .where('id', '=', dbTenant.admin_id)
            .executeTakeFirst();

          if (admin && admin.email) {
            // Find person matching admin email
            const person = await tenantsRepo.db
              .selectFrom('persons')
              .select('id')
              .where('tenant_id', '=', dbTenant.id)
              .where(sql`lower(email)`, '=', admin.email.toLowerCase())
              .executeTakeFirst();
            if (person) {
              try {
                const workflowsController = new WorkflowsController();
                await workflowsController.triggerWorkflow(dbTenant.id, String(person.id), 'payment_event', event.type);
              } catch (err) {
                console.error('Failed to trigger billing workflow on invoice.payment_failed:', err);
              }
            }

            const mailService = new TransactionalEmailService();
            const billingPageUrl = `${env.appUrl}/settings?tab=billing`;
            const amountDue = (invoice.amount_due || 0) / 100;
            await mailService.sendMail({
              to: admin.email,
              subject: `[WARNING] Action Required: Payment Failed for CampaignRaven`,
              text: `Hi ${admin.first_name || 'Admin'},\n\nWe were unable to process the subscription payment of $${amountDue.toFixed(2)} for your organization.\n\n[WARNING] Please update your payment card immediately to prevent suspension of your organization's account.\n\nUpdate billing information here: ${billingPageUrl}`,
              html: `<p>Hi ${admin.first_name || 'Admin'},</p>
<p>We were unable to process the subscription payment of <strong>$${amountDue.toFixed(2)}</strong> for your organization.</p>
<p><strong>[WARNING]</strong> Please update your payment card immediately to prevent suspension of your organization's account.</p>
<p><a href="${billingPageUrl}">Update Billing/Card Information</a></p>`,
            });
          }
        }
        break;
      }
    }
  }

  public async activateMockPlan(auth: { tenant_id: string }, plan: 'grassroots' | 'representative') {
    if (!isMockMode) {
      throw new Error('This helper is only available in local Mock Mode');
    }

    const expiry = new Date();
    expiry.setMonth(expiry.getMonth() + 1); // 1 month from now

    await tenantsRepo.update({
      tenant_id: auth.tenant_id,
      id: auth.tenant_id,
      row: {
        stripe_customer_id: 'cus_mock_' + Math.random().toString(36).substring(7),
        stripe_subscription_id: 'sub_mock_' + Math.random().toString(36).substring(7),
        subscription_plan: plan,
        subscription_status: 'active',
        subscription_ends_at: expiry.toISOString(),
      } as any,
    });

    try {
      await this.handleSubscriptionChange(auth.tenant_id, plan, true);
    } catch (mailErr) {
      console.error('Failed to send mock subscription update email', mailErr);
    }

    return { success: true, plan };
  }

  public async cancelMockPlan(auth: { tenant_id: string }) {
    if (!isMockMode) {
      throw new Error('This helper is only available in local Mock Mode');
    }

    await tenantsRepo.update({
      tenant_id: auth.tenant_id,
      id: auth.tenant_id,
      row: {
        stripe_subscription_id: null,
        subscription_plan: 'free',
        subscription_status: 'inactive',
        subscription_ends_at: null,
      } as any,
    });

    try {
      await this.handleSubscriptionChange(auth.tenant_id, 'free', true);
    } catch (mailErr) {
      console.error('Failed to send mock subscription cancellation email', mailErr);
    }

    return { success: true };
  }

  private async handleSubscriptionChange(tenantId: string, planName: string, isMock = false): Promise<void> {
    const tenant = (await tenantsRepo.getOneBy('id', {
      tenant_id: tenantId,
      value: tenantId,
    })) as any;

    if (!tenant) return;

    // 1. Reset limit alert settings
    await tenantsRepo.db
      .deleteFrom('settings')
      .where('tenant_id', '=', tenantId)
      .where('key', '=', 'billing.limit_alerts_sent')
      .execute();

    // 2. Fetch admin user (Organization Owner)
    if (!tenant.admin_id) return;
    const admin = await tenantsRepo.db
      .selectFrom('authusers')
      .select(['email', 'first_name'])
      .where('id', '=', String(tenant.admin_id))
      .executeTakeFirst();

    if (admin && admin.email) {
      const planLimits = getPlanLimits(planName);
      const billingPageUrl = `${env.appUrl}/settings?tab=billing`;
      const mockPrefix = isMock ? '[MOCK] ' : '';

      const mailService = new TransactionalEmailService();
      await mailService.sendMail({
        to: admin.email,
        subject: `${mockPrefix}Subscription Updated: Welcome to the ${planName.toUpperCase()} Plan`,
        text: `Hi ${admin.first_name || 'Owner'},\n\n${mockPrefix}Your subscription has been successfully updated.\n\nNew Plan: ${planName.toUpperCase()}\nPrice: ${planLimits.price}\n\nPlan Limits:\n- Contacts: ${planLimits.contacts.toLocaleString()} contacts\n- User Seats: ${planLimits.seats} seats\n- Monthly Emails: ${planLimits.emails.toLocaleString()} outbound emails\n\nManage your billing here: ${billingPageUrl}`,
        html: `<p>Hi ${admin.first_name || 'Owner'},</p>
<p>${mockPrefix}Your subscription has been successfully updated.</p>
<p><strong>New Plan:</strong> ${planName.toUpperCase()}<br>
<strong>Price:</strong> ${planLimits.price}</p>
<p><strong>Active Limits:</strong></p>
<ul>
  <li><strong>Contacts:</strong> Up to ${planLimits.contacts.toLocaleString()} contacts</li>
  <li><strong>User Seats:</strong> Up to ${planLimits.seats} seats</li>
  <li><strong>Monthly Emails:</strong> Up to ${planLimits.emails.toLocaleString()} outbound emails</li>
</ul>
<p><a href="${billingPageUrl}">Manage Subscription & Billing</a></p>`,
      });
    }
  }
}
