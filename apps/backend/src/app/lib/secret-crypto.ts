import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';
import { env } from '../../env';

/**
 * S-4 (schema review 2026-07-06): application-layer encryption for secrets that
 * must be replayed rather than hashed — specifically the Microsoft/Google OAuth
 * mailbox tokens. Uses AES-256-GCM with a key derived from OAUTH_TOKEN_ENC_KEY.
 *
 * Stored format: `enc:v1:<iv_b64>:<ciphertext_b64>:<authTag_b64>`. Base64 never
 * contains ':', so the format is unambiguous to split.
 *
 * Rollout-safe by construction:
 *   - decryptSecret() passes plaintext through untouched, so values written
 *     before encryption was enabled keep working (no data migration needed;
 *     they re-encrypt naturally on the next token refresh).
 *   - encryptSecret() falls back to plaintext when no key is configured, so dev
 *     and test environments behave exactly as before. Production MUST set the
 *     key (see env.ts).
 *   - Empty strings pass through unchanged (Google stores '' when no refresh
 *     token is returned).
 */

const ALGORITHM = 'aes-256-gcm';
const IV_BYTES = 12; // GCM standard nonce length
const PREFIX = 'enc:v1:';

// A 32-byte key is derived from the env value via SHA-256, so any sufficiently
// high-entropy string works (e.g. `openssl rand -base64 32`). Computed once.
const KEY: Buffer | null = env.oauthTokenEncKey
  ? createHash('sha256').update(env.oauthTokenEncKey, 'utf8').digest()
  : null;

export function isSecretEncryptionEnabled(): boolean {
  return KEY !== null;
}

/**
 * Encrypt a secret for storage. Returns the `enc:v1:…` envelope when a key is
 * configured; otherwise returns the plaintext unchanged (pre-encryption
 * behavior). Empty input is returned as-is.
 */
export function encryptSecret(plaintext: string): string {
  if (!plaintext || KEY === null) return plaintext;

  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, KEY, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return `${PREFIX}${iv.toString('base64')}:${ciphertext.toString('base64')}:${authTag.toString('base64')}`;
}

/**
 * Decrypt a stored secret. A value without the `enc:v1:` prefix is treated as
 * legacy plaintext and returned unchanged. Throws if an encrypted value is
 * encountered without a configured key, or if authentication fails (tampering
 * or wrong key).
 */
export function decryptSecret(stored: string): string {
  if (!stored || !stored.startsWith(PREFIX)) return stored;

  if (KEY === null) {
    throw new Error('OAUTH_TOKEN_ENC_KEY is not set but an encrypted secret was found');
  }

  const parts = stored.slice(PREFIX.length).split(':');
  const [ivB64, ciphertextB64, authTagB64] = parts;
  if (parts.length !== 3 || !ivB64 || !ciphertextB64 || !authTagB64) {
    throw new Error('Malformed encrypted secret envelope');
  }

  const decipher = createDecipheriv(ALGORITHM, KEY, Buffer.from(ivB64, 'base64'));
  decipher.setAuthTag(Buffer.from(authTagB64, 'base64'));

  return Buffer.concat([decipher.update(Buffer.from(ciphertextB64, 'base64')), decipher.final()]).toString('utf8');
}
