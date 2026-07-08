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

// Spy on Stripe constructor and webhooks constructEvent
vi.mock('stripe', () => ({
  default: class MockStripe {
    webhooks = {
      constructEvent: (payload: string) => JSON.parse(payload),
    };
    subscriptions = {
      retrieve: vi.fn(),
    };
  },
}));

import { BillingController } from './controller';
import { BaseRepository } from '../../lib/base.repo';
import { WebhookEventWorker } from '../../lib/jobs/webhook-worker';

describe('Billing Webhook Async Processing Integration', () => {
  const db = (BaseRepository as any)._db;
  let controller: BillingController;
  let _worker: WebhookEventWorker;

  beforeEach(async () => {
    controller = new BillingController();
    _worker = new WebhookEventWorker();
    vi.restoreAllMocks();

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
