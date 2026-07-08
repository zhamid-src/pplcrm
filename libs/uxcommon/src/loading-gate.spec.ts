import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createLoadingGate } from './loading-gate';

describe('createLoadingGate', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('is neither loaded nor visible before any work begins', () => {
    const gate = createLoadingGate();
    expect(gate.loaded()).toBe(false);
    expect(gate.visible()).toBe(false);
  });

  it('does not report loaded while an operation is still in flight', () => {
    const gate = createLoadingGate({ delay: 300 });
    const end = gate.begin();

    expect(gate.loaded()).toBe(false); // begun, not finished
    expect(gate.visible()).toBe(false); // spinner still delayed

    end();
    expect(gate.loaded()).toBe(true); // completed → result is in place
  });

  // The exact bug this signal exists to prevent: a sub-`delay` operation never
  // trips the spinner, yet consumers must still know a load happened.
  it('reports loaded after a fast operation that never showed the spinner', () => {
    const gate = createLoadingGate({ delay: 300 });
    const end = gate.begin();
    end(); // completes well within the show delay

    vi.advanceTimersByTime(1000);

    expect(gate.visible()).toBe(false); // spinner never appeared
    expect(gate.loaded()).toBe(true); // but the load is known to have completed
  });

  it('shows the spinner for a slow operation and reports loaded once it finishes', () => {
    const gate = createLoadingGate({ delay: 300, minDuration: 300 });
    const end = gate.begin();

    vi.advanceTimersByTime(300);
    expect(gate.visible()).toBe(true);
    expect(gate.loaded()).toBe(false); // still running

    end();
    expect(gate.loaded()).toBe(true);
    vi.advanceTimersByTime(300);
    expect(gate.visible()).toBe(false);
  });
});
