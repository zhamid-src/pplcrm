import crypto from 'crypto';
import { scryptSync, timingSafeEqual } from 'crypto';

/**
 * API key format: "ws_<random32>"
 * Total length: 36 chars (includes "ws_" prefix)
 */
const KEY_PREFIX = 'ws_';
const RANDOM_BYTES = 32;

export function generateApiKey(): string {
  const random = crypto.randomBytes(RANDOM_BYTES).toString('base64url');
  return `${KEY_PREFIX}${random}`;
}

/**
 * Hash an API key using scrypt (constant-time, resistant to timing attacks).
 * Same algorithm as password hashing; treats the key as a secret.
 */
export function hashApiKey(key: string): string {
  const salt = crypto.randomBytes(16);
  const derivedKey = scryptSync(key, salt, 64);
  // Store as: salt:derivedKey (both base64 for DB portability)
  return `${salt.toString('base64')}:${derivedKey.toString('base64')}`;
}

/**
 * Verify an API key against a stored hash. Constant-time comparison.
 */
export function verifyApiKey(key: string, hash: string): boolean {
  try {
    const [saltB64, derivedB64] = hash.split(':');
    if (!saltB64 || !derivedB64) return false;

    const salt = Buffer.from(saltB64, 'base64');
    const storedDerived = Buffer.from(derivedB64, 'base64');
    const computedDerived = scryptSync(key, salt, 64);

    // Constant-time comparison
    return timingSafeEqual(computedDerived, storedDerived);
  } catch {
    return false;
  }
}

/**
 * Extract a preview (first 8 chars) for UI display.
 */
export function getKeyPreview(key: string): string {
  return key.substring(0, 8);
}
