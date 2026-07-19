// _loading-gate.ts
import { type Signal, signal } from '@angular/core';

export type loadingGate = {
  /**
   * Spinner visibility — intentionally delayed by `delay` ms and held for
   * `minDuration` ms to suppress flicker. Bind this to spinners ONLY; it can stay
   * false for a whole sub-`delay` operation, so it is not a truthful "did work
   * happen" signal.
   */
  visible: ReturnType<typeof signal<boolean>>;

  /**
   * True once the first operation has COMPLETED — ungated, so it flips even for a
   * fast operation that never trips `visible`. Set when a load finishes (not when
   * it begins), so the data it produced is already in place. Use this for
   * "has loaded at least once" state (first-load gating, skeleton-vs-empty)
   * instead of watching `visible`.
   */
  loaded: Signal<boolean>;

  /**
   * True while at least one operation is in flight — immediate and ungated,
   * unlike `visible`. Use it to choose skeleton-vs-empty on surfaces that
   * refetch after their first load (an empty list only means "no data" when
   * nothing is fetching). Never bind it to spinners; that is what the
   * delayed `visible` is for.
   */
  active: Signal<boolean>;

  begin(): () => void;
};

export function createLoadingGate(options?: { delay?: number; minDuration?: number }): loadingGate {
  const delay = options?.delay ?? 300; // ms before showing
  const minDuration = options?.minDuration ?? 300; // ms the _loading stays once visible

  const visible = signal(false);
  const loaded = signal(false);
  const active = signal(false);
  let pendingCount = 0;
  let showTimer: ReturnType<typeof setTimeout> | null = null;
  let hideTimer: ReturnType<typeof setTimeout> | null = null;
  let shownAt = 0;

  const clearShowTimer = () => {
    if (showTimer) {
      clearTimeout(showTimer);
      showTimer = null;
    }
  };
  const clearHideTimer = () => {
    if (hideTimer) {
      clearTimeout(hideTimer);
      hideTimer = null;
    }
  };

  function scheduleShow() {
    clearShowTimer();
    showTimer = setTimeout(() => {
      showTimer = null;
      if (pendingCount > 0 && !visible()) {
        visible.set(true);
        shownAt = performance.now();
      }
    }, delay);
  }

  function scheduleHide() {
    clearHideTimer();
    if (!visible()) return; // never shown → nothing to hide

    const remaining = Math.max(0, minDuration - (performance.now() - shownAt));
    hideTimer = setTimeout(() => {
      if (pendingCount === 0) visible.set(false);
    }, remaining);
  }

  function begin() {
    pendingCount++;
    active.set(true);
    if (pendingCount === 1) {
      // First operation: start the delayed show
      scheduleShow();
    }
    // Return disposer
    let done = false;
    return () => {
      if (done) return;
      done = true;
      pendingCount--;
      loaded.set(true); // an operation has completed — its result is now in place
      if (pendingCount <= 0) {
        pendingCount = 0;
        active.set(false);
        // If we never showed, cancel the show timer so _loading never appears
        clearShowTimer();
        scheduleHide(); // hides now or after minDuration
      }
    };
  }

  return { begin, visible, loaded, active };
}
