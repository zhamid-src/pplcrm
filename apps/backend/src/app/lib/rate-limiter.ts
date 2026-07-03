import { TooManyRequestsError } from '../errors/app-errors';

const store = new Map<string, number[]>();

// Periodically evict keys whose newest hit is older than any window we use, so
// the map doesn't grow unbounded with distinct IP/action keys over time.
const SWEEP_INTERVAL_MS = 5 * 60 * 1000;
const MAX_RETENTION_MS = 60 * 60 * 1000; // longest rate-limit window in use
let lastSweep = Date.now();

function sweep(now: number): void {
  if (now - lastSweep < SWEEP_INTERVAL_MS) return;
  lastSweep = now;
  for (const [key, hits] of store) {
    const newest = hits[hits.length - 1] ?? 0;
    if (now - newest > MAX_RETENTION_MS) {
      store.delete(key);
    }
  }
}

export function checkRateLimit(key: string, limit: number, windowMs: number): void {
  const now = Date.now();
  sweep(now);
  const hits = (store.get(key) ?? []).filter((t) => now - t < windowMs);
  hits.push(now);
  store.set(key, hits);
  if (hits.length > limit) {
    const firstHit = hits[0] ?? now;
    const retryAfterSec = Math.ceil((firstHit + windowMs - now) / 1000);
    throw new TooManyRequestsError(`Too many requests. Retry in ${retryAfterSec} seconds.`, { retryAfterSec });
  }
}
