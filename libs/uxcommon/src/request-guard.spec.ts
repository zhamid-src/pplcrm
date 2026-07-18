import { describe, it, expect } from 'vitest';
import { createRequestGuard } from './request-guard';

describe('createRequestGuard', () => {
  it('a lone request stays current', () => {
    const guard = createRequestGuard();
    const isCurrent = guard.begin();

    expect(isCurrent()).toBe(true);
    expect(isCurrent()).toBe(true); // stable across repeated checks
  });

  it('a newer request supersedes the previous one', () => {
    const guard = createRequestGuard();
    const first = guard.begin();
    const second = guard.begin();

    expect(first()).toBe(false); // stale response must not land
    expect(second()).toBe(true);
  });

  it('only the most recent of many interleaved requests is current', () => {
    const guard = createRequestGuard();
    const a = guard.begin();
    const b = guard.begin();
    const c = guard.begin();

    expect(a()).toBe(false);
    expect(b()).toBe(false);
    expect(c()).toBe(true);
  });

  it('a superseded checker never becomes current again', () => {
    const guard = createRequestGuard();
    const a = guard.begin();
    guard.begin();

    expect(a()).toBe(false);
    guard.begin();
    expect(a()).toBe(false);
  });

  it('independent guards do not interfere with each other', () => {
    const guardA = createRequestGuard();
    const guardB = createRequestGuard();
    const a = guardA.begin();
    guardB.begin();

    expect(a()).toBe(true); // another guard's traffic is irrelevant
  });
});
