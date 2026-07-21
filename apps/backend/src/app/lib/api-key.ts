import crypto from 'crypto';

import { hashToken } from './token-hash';

/**
 * Workspace API key: "ws_" + 32 random bytes (base64url). The key is high-entropy, so it is
 * stored as a deterministic unsalted SHA-256 hash — lookup is a single indexed equality
 * query. (Salted slow hashes like scrypt exist to protect low-entropy passwords; for a
 * 256-bit random token they add nothing but would force scanning every tenant's hash.)
 * Same scheme as every other bearer token in the codebase (token-hash.ts).
 */
const KEY_PREFIX = 'ws_';
const RANDOM_BYTES = 32;
const PREVIEW_LENGTH = 8;

export function generateApiKey(): string {
  return `${KEY_PREFIX}${crypto.randomBytes(RANDOM_BYTES).toString('base64url')}`;
}

export function hashApiKey(key: string): string {
  return hashToken(key);
}

/** First characters only, for UI display ("ws_a1b2c…"). The full key is never retrievable. */
export function getKeyPreview(key: string): string {
  return key.substring(0, PREVIEW_LENGTH);
}
