const CHALLENGE_TTL_MS = 5 * 60 * 1000; // 5 minutes

const store = new Map<string, { challenge: string; expiresAt: number }>();

export function storeChallenge(key: string, challenge: string): void {
  store.set(key, { challenge, expiresAt: Date.now() + CHALLENGE_TTL_MS });
}

// Returns the challenge and removes it (one-time use)
export function consumeChallenge(key: string): string | null {
  const entry = store.get(key);
  if (!entry) return null;
  store.delete(key);
  if (Date.now() > entry.expiresAt) return null;
  return entry.challenge;
}
