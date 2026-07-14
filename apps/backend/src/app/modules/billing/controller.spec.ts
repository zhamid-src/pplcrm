import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock env BEFORE importing controller to disable mock mode in controller
vi.mock('../../../env', async (importOriginal) => {
  const actual = (await importOriginal()) as any;
  return {
    env: {
      ...actual.env,
      stripeSecretKey: 'sk_test_live_key_not_mock',
      stripeWebhookSecret: 'whsec_test_secret',
    },
  };
});

// Spy on Stripe constructor and webhooks constructEvent. `vi.mock` factories are hoisted above
// module-level const declarations, so the mock fns themselves must go through `vi.hoisted` —
// referencing a plain outer `const` here throws "Cannot access before initialization".
const { stripeSubscriptionsRetrieve, stripeSubscriptionsUpdate } = vi.hoisted(() => ({
  stripeSubscriptionsRetrieve: vi.fn(),
  stripeSubscriptionsUpdate: vi.fn(),
}));
vi.mock('stripe', () => ({
  default: class MockStripe {
    webhooks = {
      constructEvent: (payload: string) => JSON.parse(payload),
    };
    subscriptions = {
      retrieve: stripeSubscriptionsRetrieve,
      update: stripeSubscriptionsUpdate,
    };
  },
}));

import { BillingController } from './controller';
import { BaseRepository } from '../../lib/base.repo';
import { WebhookEventWorker } from '../../lib/jobs/webhook-worker';
import { syncSubscriptionQuantity } from './subscription-sync';

describe('Billing Webhook Async Processing Integration', () => {
  const db = (BaseRepository as any)._db;
  let controller: BillingController;
  let _worker: WebhookEventWorker;

  beforeEach(async () => {
    controller = new BillingController();
    _worker = new WebhookEventWorker();
    vi.restoreAllMocks();
    stripeSubscriptionsRetrieve.mockReset();
    stripeSubscriptionsUpdate.mockReset();

    // Clean tables before tests
    await db.deleteFrom('webhook_events').execute();
  });

  afterEach(async () => {
    await db.deleteFrom('webhook_events').execute();
  });

  it('should immediately persist Stripe event payload to webhook_events as pending', async () => {
    const mockEvent = {
      id: 'evt_test_123',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_test_session',
          customer: 'cus_123',
          subscription: 'sub_123',
        },
      },
    };

    const payloadStr = JSON.stringify(mockEvent);

    // Call handleWebhook (simulating Stripe HTTP Post)
    await controller.handleWebhook(payloadStr, 'sig_header');

    // Verify it is saved in the database
    const events = await db.selectFrom('webhook_events').selectAll().execute();
    expect(events.length).toBe(1);
    expect(events[0].stripe_event_id).toBe('evt_test_123');
    expect(events[0].type).toBe('checkout.session.completed');
    expect(events[0].status).toBe('pending');
    expect(events[0].attempts).toBe(0);
  });

  it('should ignore duplicate webhook event inserts on conflict and not crash', async () => {
    const mockEvent = {
      id: 'evt_test_dup',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_test_session',
        },
      },
    };

    const payloadStr = JSON.stringify(mockEvent);

    // Call handleWebhook twice with the same event id
    await controller.handleWebhook(payloadStr, 'sig_header');
    await controller.handleWebhook(payloadStr, 'sig_header');

    // Only one row should be present
    const events = await db.selectFrom('webhook_events').selectAll().execute();
    expect(events.length).toBe(1);
    expect(events[0].stripe_event_id).toBe('evt_test_dup');
  });
});

/** Seeds a minimal billable tenant row (no admin user — the invoice.paid/subscription-changed
 * email paths no-op without one, keeping these tests focused on the quantity persistence). */
async function seedBillingTenant(
  db: any,
  overrides: Record<string, unknown> = {},
): Promise<{ tenantId: string; customerId: string }> {
  const tenantId = String(Math.floor(Math.random() * 100000000) + 1000000);
  const customerId = `cus_${tenantId}`;
  await db
    .insertInto('tenants')
    .values({
      id: tenantId,
      name: 'Test Tenant Webhook Quantity',
      subscription_plan: 'grassroots',
      subscription_status: 'active',
      subscription_quantity: 1,
      stripe_customer_id: customerId,
      stripe_subscription_id: `sub_${tenantId}`,
      ...overrides,
    })
    .execute();
  return { tenantId, customerId };
}

async function cleanBillingTenant(db: any, tenantId: string): Promise<void> {
  await db.deleteFrom('background_jobs').where('tenant_id', '=', tenantId).execute();
  await db.deleteFrom('settings').where('tenant_id', '=', tenantId).execute();
  await db.deleteFrom('persons').where('tenant_id', '=', tenantId).execute();
  await db.deleteFrom('tenants').where('id', '=', tenantId).execute();
}

describe('BillingController.processWebhookEvent — subscription_quantity persistence', () => {
  const db = (BaseRepository as any)._db;
  let controller: BillingController;
  let tenantId: string;
  let customerId: string;

  beforeEach(async () => {
    controller = new BillingController();
    vi.restoreAllMocks();
    stripeSubscriptionsRetrieve.mockReset();
    stripeSubscriptionsUpdate.mockReset();
  });

  afterEach(async () => {
    await cleanBillingTenant(db, tenantId);
  });

  it('persists the Stripe item quantity on customer.subscription.updated', async () => {
    ({ tenantId, customerId } = await seedBillingTenant(db));

    await controller.processWebhookEvent({
      id: 'evt_sub_updated',
      type: 'customer.subscription.updated',
      data: {
        object: {
          id: `sub_${tenantId}`,
          customer: customerId,
          status: 'active',
          items: { data: [{ price: { id: 'price_unknown' }, quantity: 4, current_period_end: null }] },
        },
      },
    } as any);

    const tenant = await db.selectFrom('tenants').selectAll().where('id', '=', tenantId).executeTakeFirst();
    expect(tenant.subscription_quantity).toBe(4);
  });

  it('resets subscription_quantity to 1 on customer.subscription.deleted', async () => {
    ({ tenantId, customerId } = await seedBillingTenant(db, { subscription_quantity: 7 }));

    await controller.processWebhookEvent({
      id: 'evt_sub_deleted',
      type: 'customer.subscription.deleted',
      data: { object: { id: `sub_${tenantId}`, customer: customerId } },
    } as any);

    const tenant = await db.selectFrom('tenants').selectAll().where('id', '=', tenantId).executeTakeFirst();
    expect(tenant.subscription_quantity).toBe(1);
    expect(tenant.subscription_plan).toBe('free');
  });

  it('downgrades the billed quantity on invoice.paid when the emailable count has dropped', async () => {
    // Grassroots bracket 5 tops out at 12,500 — with zero emailable persons seeded, the current
    // bracket resolves to 1, which is below the billed quantity of 5, so invoice.paid (proof
    // we've crossed a cycle boundary) should reconcile the billed quantity down to 1.
    ({ tenantId, customerId } = await seedBillingTenant(db, { subscription_quantity: 5 }));
    stripeSubscriptionsRetrieve.mockResolvedValue({
      items: { data: [{ id: 'si_1', quantity: 5 }] },
    });

    await controller.processWebhookEvent({
      id: 'evt_invoice_paid',
      type: 'invoice.paid',
      data: {
        object: {
          customer: customerId,
          amount_paid: 4900,
          hosted_invoice_url: 'https://stripe.example.com/invoice',
          lines: { data: [] },
        },
      },
    } as any);

    expect(stripeSubscriptionsUpdate).toHaveBeenCalledWith('sub_' + tenantId, {
      items: [{ id: 'si_1', quantity: 1 }],
      proration_behavior: 'none',
    });
    const tenant = await db.selectFrom('tenants').selectAll().where('id', '=', tenantId).executeTakeFirst();
    expect(tenant.subscription_quantity).toBe(1);
  });

  it('does not sync on invoice.paid when the billed quantity is already at (or below) the current bracket', async () => {
    ({ tenantId, customerId } = await seedBillingTenant(db, { subscription_quantity: 1 }));

    await controller.processWebhookEvent({
      id: 'evt_invoice_paid_noop',
      type: 'invoice.paid',
      data: {
        object: {
          customer: customerId,
          amount_paid: 2900,
          hosted_invoice_url: 'https://stripe.example.com/invoice',
          lines: { data: [] },
        },
      },
    } as any);

    expect(stripeSubscriptionsUpdate).not.toHaveBeenCalled();
    const tenant = await db.selectFrom('tenants').selectAll().where('id', '=', tenantId).executeTakeFirst();
    expect(tenant.subscription_quantity).toBe(1);
  });
});

describe('syncSubscriptionQuantity (live mode) — idempotency + proration_behavior', () => {
  const db = (BaseRepository as any)._db;
  let tenantId: string;

  beforeEach(async () => {
    vi.restoreAllMocks();
    stripeSubscriptionsRetrieve.mockReset();
    stripeSubscriptionsUpdate.mockReset();
    ({ tenantId } = await seedBillingTenant(db));
  });

  afterEach(async () => {
    await cleanBillingTenant(db, tenantId);
  });

  it('is a no-op (does not call subscriptions.update) when the live quantity already matches', async () => {
    stripeSubscriptionsRetrieve.mockResolvedValue({
      items: { data: [{ id: 'si_1', quantity: 3 }] },
    });

    await syncSubscriptionQuantity(tenantId, 3);

    expect(stripeSubscriptionsUpdate).not.toHaveBeenCalled();
  });

  it('calls subscriptions.update with proration_behavior "none" when the quantity differs, and writes the column optimistically', async () => {
    stripeSubscriptionsRetrieve.mockResolvedValue({
      items: { data: [{ id: 'si_1', quantity: 2 }] },
    });

    await syncSubscriptionQuantity(tenantId, 6);

    expect(stripeSubscriptionsUpdate).toHaveBeenCalledWith('sub_' + tenantId, {
      items: [{ id: 'si_1', quantity: 6 }],
      proration_behavior: 'none',
    });
    const tenant = await db.selectFrom('tenants').selectAll().where('id', '=', tenantId).executeTakeFirst();
    expect(tenant.subscription_quantity).toBe(6);
  });

  it('calling it twice in a row with the same target quantity only updates Stripe once (idempotent)', async () => {
    stripeSubscriptionsRetrieve.mockResolvedValueOnce({ items: { data: [{ id: 'si_1', quantity: 1 }] } });
    await syncSubscriptionQuantity(tenantId, 8);
    expect(stripeSubscriptionsUpdate).toHaveBeenCalledTimes(1);

    // Second call: the "live" retrieve now reflects the already-applied quantity.
    stripeSubscriptionsRetrieve.mockResolvedValueOnce({ items: { data: [{ id: 'si_1', quantity: 8 }] } });
    await syncSubscriptionQuantity(tenantId, 8);
    expect(stripeSubscriptionsUpdate).toHaveBeenCalledTimes(1);
  });
});
