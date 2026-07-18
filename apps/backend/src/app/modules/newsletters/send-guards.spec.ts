import { describe, expect, it } from 'vitest';

import {
  FREE_WARMUP_DAILY_CAP,
  FREE_WARMUP_DAYS,
  TRIPWIRE_MIN_RECIPIENTS,
  evaluateTripwires,
  hasPaymentHold,
  monthlyEmailCap,
  planKeyOf,
  sendWindow,
  warmupDailyCap,
  type SendingTenant,
} from './send-guards';

function tenantWith(overrides: Partial<SendingTenant>): SendingTenant {
  return {
    id: '1',
    plan: 'grassroots',
    subscription_quantity: 1,
    subscription_ends_at: null,
    subscription_status: 'active',
    created_at: null,
    suspended_at: null,
    sending_paused_at: null,
    sending_phone_verified_at: null,
    ...overrides,
  };
}

const DAY_MS = 24 * 60 * 60 * 1000;

describe('planKeyOf', () => {
  it('resolves known plans and legacy aliases', () => {
    expect(planKeyOf('movement')).toBe('movement');
    expect(planKeyOf('Grassroots')).toBe('grassroots');
    expect(planKeyOf('starter')).toBe('free'); // legacy alias
  });

  it('fails closed to free for unknown or missing values', () => {
    expect(planKeyOf(null)).toBe('free');
    expect(planKeyOf(undefined)).toBe('free');
    expect(planKeyOf('who-knows')).toBe('free');
  });
});

describe('warmupDailyCap', () => {
  const now = new Date('2026-07-14T12:00:00Z');

  it('caps a brand-new free tenant', () => {
    const createdAt = new Date(now.getTime() - 1 * DAY_MS);
    expect(warmupDailyCap('free', createdAt, now)).toBe(FREE_WARMUP_DAILY_CAP);
  });

  it('lifts the cap once the warm-up window passes', () => {
    const createdAt = new Date(now.getTime() - (FREE_WARMUP_DAYS + 1) * DAY_MS);
    expect(warmupDailyCap('free', createdAt, now)).toBeNull();
  });

  it('still caps exactly at the boundary minus a millisecond', () => {
    const createdAt = new Date(now.getTime() - FREE_WARMUP_DAYS * DAY_MS + 1);
    expect(warmupDailyCap('free', createdAt, now)).toBe(FREE_WARMUP_DAILY_CAP);
  });

  it('never applies to paid plans, even brand-new ones', () => {
    const createdAt = new Date(now.getTime() - 1 * DAY_MS);
    expect(warmupDailyCap('grassroots', createdAt, now)).toBeNull();
    expect(warmupDailyCap('movement', createdAt, now)).toBeNull();
    expect(warmupDailyCap('enterprise', createdAt, now)).toBeNull();
  });

  it('fails closed when the creation date is unknown', () => {
    expect(warmupDailyCap('free', null, now)).toBe(FREE_WARMUP_DAILY_CAP);
  });
});

describe('monthlyEmailCap', () => {
  it('multiplies the billed bracket subscriber cap by the plan multiplier (2x/8x/12x)', () => {
    expect(monthlyEmailCap('free', 1)).toBe(2_000); // 1,000 × 2
    expect(monthlyEmailCap('grassroots', 1)).toBe(8_000); // 1,000 × 8
    expect(monthlyEmailCap('grassroots', 2)).toBe(20_000); // 2,500 × 8
    expect(monthlyEmailCap('movement', 6)).toBe(240_000); // 20,000 × 12
  });

  it('is uncapped for enterprise (no pricing ladder)', () => {
    expect(monthlyEmailCap('enterprise', 1)).toBe(Number.POSITIVE_INFINITY);
  });
});

describe('sendWindow', () => {
  it('meters the UTC calendar month when there is no billing cycle (free tenants)', () => {
    const { start, resetsAt } = sendWindow(null, new Date('2026-07-14T12:00:00Z'));
    expect(start.toISOString()).toBe('2026-07-01T00:00:00.000Z');
    expect(resetsAt.toISOString()).toBe('2026-08-01T00:00:00.000Z');
  });

  it('uses the current billing cycle on a monthly subscription', () => {
    const endsAt = new Date('2026-07-19T09:00:00Z'); // renewal 5 days from "now"
    const { start, resetsAt } = sendWindow(endsAt, new Date('2026-07-14T12:00:00Z'));
    expect(start.toISOString()).toBe('2026-06-19T09:00:00.000Z');
    expect(resetsAt.toISOString()).toBe('2026-07-19T09:00:00.000Z');
  });

  it('still resets monthly on an annual subscription (endsAt far in the future)', () => {
    const endsAt = new Date('2027-03-19T09:00:00Z');
    const { start, resetsAt } = sendWindow(endsAt, new Date('2026-07-14T12:00:00Z'));
    expect(start.toISOString()).toBe('2026-06-19T09:00:00.000Z');
    expect(resetsAt.toISOString()).toBe('2026-07-19T09:00:00.000Z');
  });

  it('steps forward so the window always contains now when the subscription has lapsed', () => {
    const endsAt = new Date('2026-03-19T09:00:00Z'); // months in the past
    const now = new Date('2026-07-14T12:00:00Z');
    const { start, resetsAt } = sendWindow(endsAt, now);
    expect(start <= now).toBe(true);
    expect(resetsAt > now).toBe(true);
    expect(start.toISOString()).toBe('2026-06-19T09:00:00.000Z');
    expect(resetsAt.toISOString()).toBe('2026-07-19T09:00:00.000Z');
  });
});

describe('hasPaymentHold', () => {
  it('holds a paid tenant whose subscription is past_due or unpaid', () => {
    expect(hasPaymentHold(tenantWith({ subscription_status: 'past_due' }))).toBe(true);
    expect(hasPaymentHold(tenantWith({ plan: 'movement', subscription_status: 'unpaid' }))).toBe(true);
  });

  it('never holds an active/trialing paid tenant', () => {
    expect(hasPaymentHold(tenantWith({ subscription_status: 'active' }))).toBe(false);
    expect(hasPaymentHold(tenantWith({ subscription_status: 'trialing' }))).toBe(false);
  });

  it('never holds free or enterprise tenants (no self-serve invoice to fail)', () => {
    expect(hasPaymentHold(tenantWith({ plan: 'free', subscription_status: 'past_due' }))).toBe(false);
    expect(hasPaymentHold(tenantWith({ plan: 'enterprise', subscription_status: 'unpaid' }))).toBe(false);
  });
});

describe('evaluateTripwires', () => {
  it('ignores sends below the minimum sample size', () => {
    expect(
      evaluateTripwires({ totalRecipients: TRIPWIRE_MIN_RECIPIENTS - 1, hardBounces: 10, spamReports: 10 }),
    ).toBeNull();
  });

  it('pauses on a hard-bounce rate above 5%', () => {
    expect(evaluateTripwires({ totalRecipients: 100, hardBounces: 6, spamReports: 0 })).toBe('pause');
  });

  it('does not pause at exactly 5%', () => {
    expect(evaluateTripwires({ totalRecipients: 100, hardBounces: 5, spamReports: 0 })).toBeNull();
  });

  it('suspends on a spam-complaint rate above 1%', () => {
    expect(evaluateTripwires({ totalRecipients: 100, hardBounces: 0, spamReports: 2 })).toBe('suspend');
  });

  it('does not suspend at exactly 1%', () => {
    expect(evaluateTripwires({ totalRecipients: 100, hardBounces: 0, spamReports: 1 })).toBeNull();
  });

  it('prefers suspension when both tripwires fire', () => {
    expect(evaluateTripwires({ totalRecipients: 100, hardBounces: 20, spamReports: 5 })).toBe('suspend');
  });

  it('stays quiet on a healthy send', () => {
    expect(evaluateTripwires({ totalRecipients: 1000, hardBounces: 10, spamReports: 0 })).toBeNull();
  });
});
