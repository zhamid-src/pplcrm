import Stripe from 'stripe';
import { env } from '../../../env';
import { TenantsRepo } from '../auth/repositories/tenants.repo';
import { TransactionalEmailService } from '../../lib/mail/transactional-mail.service';

const isMockMode = !env.stripeSecretKey || env.stripeSecretKey.includes('MockKey');
const stripe = isMockMode ? null : new Stripe(env.stripeSecretKey!);
const tenantsRepo = new TenantsRepo();

export class BillingController {
  constructor() {
    if (isMockMode) {
      console.log('💳 [BillingController] Running in Mock Mode (no Stripe secret key provided)');
    }
  }

  /**
   * Helper to derive the frontend base URL
   */
  private getFrontendUrl(): string {
    return env.apiUrl.replace(':3000', ':4200'); // standard dev replace, or env.apiUrl in prod
  }

  /**
   * Fetch current subscription plan, status, and expiry details
   */
  public async getBillingDetails(auth: { tenant_id: string }) {
    const tenant = await tenantsRepo.getOneBy('id', {
      tenant_id: auth.tenant_id,
      value: auth.tenant_id,
    }) as any;

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

  /**
   * Generate a Stripe Checkout session or a Mock Checkout redirect url
   */
  public async createCheckoutSession(
    auth: { tenant_id: string; user_id: string },
    plan: 'grassroots' | 'representative'
  ) {
    const tenant = await tenantsRepo.getOneBy('id', {
      tenant_id: auth.tenant_id,
      value: auth.tenant_id,
    }) as any;

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
    const priceId =
      plan === 'grassroots'
        ? env.stripePlanGrassrootsPriceId
        : env.stripePlanRepresentativePriceId;

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

  /**
   * Generate Stripe Customer Portal session or a mock billing dashboard redirect
   */
  public async createPortalSession(auth: { tenant_id: string }) {
    const tenant = await tenantsRepo.getOneBy('id', {
      tenant_id: auth.tenant_id,
      value: auth.tenant_id,
    }) as any;

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

  /**
   * Process a Stripe Webhook call
   */
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

    console.log(`💳 Received webhook event: ${event.type}`);

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const tenantId = session.metadata?.['tenantId'];
        const subscriptionId = session.subscription as string;
        const customerId = session.customer as string;

        if (tenantId && subscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId) as any;
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
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const subscriptionId = subscription.id;
        const customerId = subscription.customer as string;
        
        // Search Kysely database for the tenant with matching customer id
        const dbTenant = await tenantsRepo.getOneBy('stripe_customer_id', {
          tenant_id: '1' as any,
          value: customerId,
        }) as any;

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
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        const dbTenant = await tenantsRepo.getOneBy('stripe_customer_id', {
          tenant_id: '1' as any,
          value: customerId,
        }) as any;

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
        }
        break;
      }

      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;
        const dbTenant = await tenantsRepo.getOneBy('stripe_customer_id', {
          tenant_id: '1' as any,
          value: customerId,
        }) as any;

        if (dbTenant) {
          const admin = await tenantsRepo.db.selectFrom('authusers')
            .select(['email', 'first_name'])
            .where('id', '=', dbTenant.admin_id as any)
            .executeTakeFirst();

          if (admin && admin.email) {
            const mailService = new TransactionalEmailService();
            const amountPaid = invoice.amount_paid / 100;
            const pdfUrl = invoice.hosted_invoice_url || '';
            await mailService.sendMail({
              to: admin.email,
              subject: `Receipt for your CampaignRaven Subscription`,
              text: `Hi ${admin.first_name || 'Admin'},\n\nThis is a receipt confirming your subscription payment of $${amountPaid.toFixed(2)} was successfully processed.\n\nView invoice: ${pdfUrl}`,
              html: `<p>Hi ${admin.first_name || 'Admin'},</p><p>This is a receipt confirming your subscription payment of <strong>$${amountPaid.toFixed(2)}</strong> was successfully processed.</p><p><a href="${pdfUrl}">View/Download Invoice Receipt</a></p>`,
            });
          }
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;
        const dbTenant = await tenantsRepo.getOneBy('stripe_customer_id', {
          tenant_id: '1' as any,
          value: customerId,
        }) as any;

        if (dbTenant) {
          const admin = await tenantsRepo.db.selectFrom('authusers')
            .select(['email', 'first_name'])
            .where('id', '=', dbTenant.admin_id as any)
            .executeTakeFirst();

          if (admin && admin.email) {
            const mailService = new TransactionalEmailService();
            const billingPageUrl = `http://localhost:4200/settings?tab=billing`;
            await mailService.sendMail({
              to: admin.email,
              subject: `Urgent: Action Required - Payment Failed for CampaignRaven`,
              text: `Hi ${admin.first_name || 'Admin'},\n\nWe were unable to process the payment for your subscription. Please update your billing information to prevent account suspension.\n\nUpdate billing info here: ${billingPageUrl}`,
              html: `<p>Hi ${admin.first_name || 'Admin'},</p><p>We were unable to process the payment for your subscription. Please update your billing information to prevent account suspension.</p><p><a href="${billingPageUrl}">Update Billing Information</a></p>`,
            });
          }
        }
        break;
      }
    }
  }

  /**
   * Helper mutation to simulate a checkout webhook locally (Mock Mode only)
   */
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
      const tenant = await tenantsRepo.getOneBy('id', {
        tenant_id: auth.tenant_id,
        value: auth.tenant_id,
      }) as any;
      if (tenant) {
        const admin = await tenantsRepo.db.selectFrom('authusers')
          .select(['email', 'first_name'])
          .where('id', '=', tenant.admin_id as any)
          .executeTakeFirst();
        if (admin && admin.email) {
          const mailService = new TransactionalEmailService();
          await mailService.sendMail({
            to: admin.email,
            subject: `[MOCK] Receipt for your CampaignRaven Subscription`,
            text: `Hi ${admin.first_name || 'Admin'},\n\nThis is a mock receipt confirming your subscription payment for plan: ${plan} was successfully processed.`,
            html: `<p>Hi ${admin.first_name || 'Admin'},</p><p>This is a mock receipt confirming your subscription payment for plan: <strong>${plan}</strong> was successfully processed.</p>`,
          });
        }
      }
    } catch (mailErr) {
      console.error('Failed to send mock receipt email', mailErr);
    }

    return { success: true, plan };
  }

  /**
   * Helper mutation to cancel mock plan locally (Mock Mode only)
   */
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

    return { success: true };
  }
}
