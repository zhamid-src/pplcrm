import { TooManyRequestsError } from '../errors/app-errors';

const store = new Map<string, number[]>();

export function checkRateLimit(key: string, limit: number, windowMs: number): void {
  const now = Date.now();
  const hits = (store.get(key) ?? []).filter((t) => now - t < windowMs);
  hits.push(now);
  store.set(key, hits);
  if (hits.length > limit) {
    const firstHit = hits[0] ?? now;
    const retryAfterSec = Math.ceil((firstHit + windowMs - now) / 1000);
    throw new TooManyRequestsError(`Too many requests. Retry in ${retryAfterSec} seconds.`, { retryAfterSec });
  }
}
