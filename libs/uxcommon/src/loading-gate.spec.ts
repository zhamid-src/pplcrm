import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createLoadingGate } from './loading-gate';

describe('createLoadingGate', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('is neither started nor visible before any work begins', () => {
    const gate = createLoadingGate();
    expect(gate.started()).toBe(false);
    expect(gate.visible()).toBe(false);
  });

  it('flips started immediately on begin(), before the spinner delay elapses', () => {
    const gate = createLoadingGate({ delay: 300 });
    const end = gate.begin();

    expect(gate.started()).toBe(true); // ungated — true right away
    expect(gate.visible()).toBe(false); // spinner still delayed

    end();
  });

  // The exact bug this signal exists to prevent: a sub-`delay` operation never
  // trips the spinner, yet consumers must still know a load happened.
  it('keeps started true after a fast operation that never showed the spinner', () => {
    const gate = createLoadingGate({ delay: 300 });
    const end = gate.begin();
    end(); // completes well within the show delay

    vi.advanceTimersByTime(1000);

    expect(gate.visible()).toBe(false); // spinner never appeared
    expect(gate.started()).toBe(true); // but the load is known to have run
  });

  it('shows the spinner for a slow operation and still reports started', () => {
    const gate = createLoadingGate({ delay: 300, minDuration: 300 });
    const end = gate.begin();

    vi.advanceTimersByTime(300);
    expect(gate.visible()).toBe(true);

    end();
    vi.advanceTimersByTime(300);
    expect(gate.visible()).toBe(false);
    expect(gate.started()).toBe(true);
  });
});
