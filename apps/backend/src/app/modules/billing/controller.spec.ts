import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Stripe from 'stripe';

// Mock env BEFORE importing controller to disable mock mode in controller
vi.mock('../../../env', async (importOriginal) => {
  const actual = await importOriginal() as any;
  return {
    env: {
      ...actual.env,
      stripeSecretKey: 'sk_test_live_key_not_mock',
      stripeWebhookSecret: 'whsec_test_secret',
    },
  };
});

// Spy on Stripe constructor and webhooks constructEvent
vi.mock('stripe', () => {
  return {
    default: class MockStripe {
      webhooks = {
        constructEvent: (payload: string) => {
          return JSON.parse(payload);
        },
      };
      subscriptions = {
        retrieve: vi.fn(),
      };
    },
  };
});

import { BillingController } from './controller';
import { BaseRepository } from '../../lib/base.repo';
import { WebhookEventWorker } from '../../lib/jobs/webhook-worker';

describe('Billing Webhook Async Processing Integration', () => {
  const db = (BaseRepository as any)._db;
  let controller: BillingController;
  let worker: WebhookEventWorker;

  beforeEach(async () => {
    controller = new BillingController();
    worker = new WebhookEventWorker();
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

  it('should process the enqueued event successfully using WebhookEventWorker', async () => {
    const mockEvent = {
      id: 'evt_test_process',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_test_session',
        },
      },
    };

    // Insert pending event directly to db
    await db.insertInto('webhook_events' as any)
      .values({
        stripe_event_id: mockEvent.id,
        type: mockEvent.type,
        payload: mockEvent as any,
        status: 'pending',
      })
      .execute();

    // Spy on controller.processWebhookEvent
    const spy = vi.spyOn(BillingController.prototype, 'processWebhookEvent').mockResolvedValue(undefined);

    // Run one processing cycle of the worker
    await (worker as any).processNextEvent();

    // Verify the handler was called
    expect(spy).toHaveBeenCalled();

    // Verify event in DB is marked processed
    const events = await db.selectFrom('webhook_events').selectAll().execute();
    expect(events.length).toBe(1);
    expect(events[0].status).toBe('processed');
    expect(events[0].processed_at).not.toBeNull();
    expect(events[0].attempts).toBe(1);
  });

  it('should reschedule the event with backoff on failure and eventually mark as failed', async () => {
    const mockEvent = {
      id: 'evt_test_fail',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_test_session',
        },
      },
    };

    // Insert pending event with 2 attempts (max attempts is 3)
    await db.insertInto('webhook_events' as any)
      .values({
        stripe_event_id: mockEvent.id,
        type: mockEvent.type,
        payload: mockEvent as any,
        status: 'pending',
        attempts: 2,
      })
      .execute();

    // Force processWebhookEvent to throw an error
    vi.spyOn(BillingController.prototype, 'processWebhookEvent').mockRejectedValue(new Error('Stripe API error'));

    // Run processing cycle - this should increment attempts to 3 and mark as failed
    await (worker as any).processNextEvent();

    const events = await db.selectFrom('webhook_events').selectAll().execute();
    expect(events.length).toBe(1);
    expect(events[0].status).toBe('failed');
    expect(events[0].attempts).toBe(3);
    expect(events[0].error).toContain('Stripe API error');
  });
});
