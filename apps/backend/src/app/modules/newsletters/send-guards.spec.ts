import { describe, expect, it } from 'vitest';

import {
  FREE_WARMUP_DAILY_CAP,
  FREE_WARMUP_DAYS,
  TRIPWIRE_MIN_RECIPIENTS,
  evaluateTripwires,
  planKeyOf,
  warmupDailyCap,
} from './send-guards';

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
