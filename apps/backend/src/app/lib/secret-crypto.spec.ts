import { afterEach, describe, expect, it, vi } from 'vitest';

// secret-crypto derives its key once at module load from env.oauthTokenEncKey, so
// each scenario mocks the env module and re-imports a fresh copy of the module.
async function loadCrypto(oauthTokenEncKey: string | undefined) {
  vi.resetModules();
  vi.doMock('../../env', () => ({ env: { oauthTokenEncKey } }));
  return import('./secret-crypto');
}

const KEY = 'unit-test-oauth-token-encryption-key-please-ignore';

describe('secret-crypto', () => {
  afterEach(() => {
    vi.doUnmock('../../env');
    vi.resetModules();
  });

  describe('with a key configured', () => {
    it('round-trips a value and wraps it in the enc:v1 envelope', async () => {
      const { encryptSecret, decryptSecret, isSecretEncryptionEnabled } = await loadCrypto(KEY);
      expect(isSecretEncryptionEnabled()).toBe(true);

      const secret = 'ya29.a0AfB_byC-super-secret-access-token';
      const encrypted = encryptSecret(secret);

      expect(encrypted).toMatch(/^enc:v1:/);
      expect(encrypted).not.toContain(secret);
      expect(decryptSecret(encrypted)).toBe(secret);
    });

    it('uses a fresh IV each time (ciphertexts differ, both decrypt correctly)', async () => {
      const { encryptSecret, decryptSecret } = await loadCrypto(KEY);
      const a = encryptSecret('same-token');
      const b = encryptSecret('same-token');
      expect(a).not.toBe(b);
      expect(decryptSecret(a)).toBe('same-token');
      expect(decryptSecret(b)).toBe('same-token');
    });

    it('passes legacy plaintext through on decrypt', async () => {
      const { decryptSecret } = await loadCrypto(KEY);
      expect(decryptSecret('legacy-plaintext-token')).toBe('legacy-plaintext-token');
    });

    it('leaves empty strings untouched', async () => {
      const { encryptSecret, decryptSecret } = await loadCrypto(KEY);
      expect(encryptSecret('')).toBe('');
      expect(decryptSecret('')).toBe('');
    });

    it('rejects tampered ciphertext (GCM auth failure)', async () => {
      const { encryptSecret, decryptSecret } = await loadCrypto(KEY);
      const encrypted = encryptSecret('token');
      const parts = encrypted.split(':');
      // Flip a byte in the ciphertext segment.
      const ct = Buffer.from(parts[3], 'base64');
      ct[0] ^= 0xff;
      parts[3] = ct.toString('base64');
      expect(() => decryptSecret(parts.join(':'))).toThrow();
    });

    it('cannot be decrypted with a different key', async () => {
      const { encryptSecret } = await loadCrypto(KEY);
      const encrypted = encryptSecret('token');
      const { decryptSecret } = await loadCrypto('a-completely-different-key');
      expect(() => decryptSecret(encrypted)).toThrow();
    });
  });

  describe('without a key configured', () => {
    it('stores plaintext (pre-encryption fallback) and reports disabled', async () => {
      const { encryptSecret, isSecretEncryptionEnabled } = await loadCrypto(undefined);
      expect(isSecretEncryptionEnabled()).toBe(false);
      expect(encryptSecret('token')).toBe('token');
    });

    it('still passes plaintext through on decrypt but throws on encrypted input', async () => {
      const { decryptSecret } = await loadCrypto(undefined);
      expect(decryptSecret('plaintext')).toBe('plaintext');
      expect(() => decryptSecret('enc:v1:aaa:bbb:ccc')).toThrow(/not set/i);
    });
  });
});
