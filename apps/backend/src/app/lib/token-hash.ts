/**
 * Cryptographic token utilities.
 *
 * Tokens (password reset codes, session IDs, refresh tokens) are generated as
 * high-entropy random strings, sent in plaintext to the client, but stored in
 * the database as their SHA-256 hash. This way, a leaked database dump cannot
 * be used to hijack active sessions or reset passwords.
 *
 * Usage:
 *   const plain = generateToken();   // send this to the user
 *   const hash  = hashToken(plain);  // store this in the DB
 *   // On incoming request:
 *   const match = hashToken(incoming) === storedHash;
 */
import { randomBytes, createHash } from 'crypto';

/**
 * Generates a cryptographically secure random token (32 bytes → 64 hex chars).
 */
export function generateToken(): string {
  return randomBytes(32).toString('hex');
}

/**
 * Returns the SHA-256 hex digest of a token.
 * Used for both storing a new token and looking up an incoming token.
 */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
