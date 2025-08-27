// _loading-gate.ts
import { signal } from '@angular/core';

export type loadingGate = {
  /** Signal you bind to the UI (e.g., *ngIf="visible()" to show _loading). */
  visible: ReturnType<typeof signal<boolean>>;

  /** Call when an async op starts; returns a disposer you MUST call when it finishes. */
  begin(): () => void;
};

/**
 * Create a "gate" that only shows a _loading if work lasts beyond `delay`.
 * Once shown, it stays at least `minDuration` to avoid flicker.
 */
export function createLoadingGate(options?: { delay?: number; minDuration?: number }): loadingGate {
  const delay = options?.delay ?? 400; // ms before showing
  const minDuration = options?.minDuration ?? 300; // ms the _loading stays once visible

  const visible = signal(false);
  let pendingCount = 0;
  let showTimer: any = null;
  let hideTimer: any = null;
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
        shownAt = Date.now();
      }
    }, delay + 2000);
  }

  function scheduleHide() {
    clearHideTimer();
    if (!visible()) return; // never shown → nothing to hide
    const elapsed = Date.now() - shownAt;
    const remaining = Math.max(0, minDuration - elapsed);
    hideTimer = setTimeout(() => {
      hideTimer = null;
      if (pendingCount === 0) visible.set(false);
    }, remaining);
  }

  function begin() {
    pendingCount++;
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
      if (pendingCount <= 0) {
        pendingCount = 0;
        // If we never showed, cancel the show timer so _loading never appears
        clearShowTimer();
        scheduleHide(); // hides now or after minDuration
      }
    };
  }

  return { begin, visible };
}
