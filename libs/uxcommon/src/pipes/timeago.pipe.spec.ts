import { ChangeDetectorRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TimeAgoPipe } from './timeago.pipe';

const NOW = new Date('2026-07-17T12:00:00Z');

describe('TimeAgoPipe', () => {
  let pipe: TimeAgoPipe;

  const agoMs = (ms: number) => new Date(NOW.getTime() - ms);
  const MINUTE = 60_000;
  const HOUR = 60 * MINUTE;
  const DAY = 24 * HOUR;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    TestBed.configureTestingModule({
      providers: [{ provide: ChangeDetectorRef, useValue: { markForCheck: vi.fn() } }],
    });
    pipe = TestBed.runInInjectionContext(() => new TimeAgoPipe());
  });

  afterEach(() => {
    pipe.ngOnDestroy();
    vi.useRealTimers();
  });

  it('renders empty for nullish input and echoes unparseable strings', () => {
    expect(pipe.transform(null)).toBe('');
    expect(pipe.transform(undefined)).toBe('');
    expect(pipe.transform('')).toBe('');
    expect(pipe.transform('not-a-date')).toBe('not-a-date');
  });

  it.each([
    [30_000, 'just now'],
    [MINUTE, 'a minute ago'],
    [5 * MINUTE, '5 minutes ago'],
    [HOUR, 'an hour ago'],
    [5 * HOUR, '5 hours ago'],
    [25 * HOUR, 'yesterday'],
    [5 * DAY, '5 days ago'],
    [45 * DAY, 'a month ago'],
    [100 * DAY, '3 months ago'],
    [400 * DAY, 'a year ago'],
    [800 * DAY, '2 years ago'],
  ])('long style: %i ms ago → %s', (ms, expected) => {
    expect(pipe.transform(agoMs(ms))).toBe(expected);
  });

  it('drops the suffix when hideSuffix is set', () => {
    expect(pipe.transform(agoMs(5 * MINUTE), { hideSuffix: true })).toBe('5 minutes');
  });

  it.each([
    [30_000, 'now'],
    [5 * MINUTE, '5m'],
    [5 * HOUR, '5h'],
    [5 * DAY, '5d'],
  ])('compact style: %i ms ago → %s', (ms, expected) => {
    expect(pipe.transform(agoMs(ms), { compact: true })).toBe(expected);
  });

  it('falls back to an absolute date once thresholdDays is exceeded', () => {
    const result = pipe.transform(agoMs(10 * DAY), { thresholdDays: 7 });

    expect(result).not.toContain('ago');
    expect(result).toMatch(/2026/); // an absolute, year-bearing date string
  });

  it('keeps relative wording while under the threshold', () => {
    expect(pipe.transform(agoMs(5 * DAY), { thresholdDays: 7 })).toBe('5 days ago');
  });

  it('memoizes the result for an unchanged value', () => {
    const value = agoMs(5 * MINUTE);
    const first = pipe.transform(value);

    expect(pipe.transform(value)).toBe(first);
  });

  it('clears its self-refresh timer on destroy', () => {
    pipe.transform(agoMs(5 * MINUTE));
    expect(vi.getTimerCount()).toBeGreaterThan(0);

    pipe.ngOnDestroy();

    expect(vi.getTimerCount()).toBe(0);
  });
});
