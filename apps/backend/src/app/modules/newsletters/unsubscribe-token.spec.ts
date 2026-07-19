import { describe, expect, it, vi } from 'vitest';

vi.mock('../../../env', () => ({ env: { sharedSecret: 'test-secret' } }));

import { decodeUnsubscribeToken, encodeUnsubscribeToken } from './unsubscribe-token';

describe('unsubscribe token', () => {
  const payload = { tenantId: '42', personId: '7', email: 'amira@example.org' };

  it('round-trips a payload', () => {
    const token = encodeUnsubscribeToken(payload);
    expect(decodeUnsubscribeToken(token)).toEqual(payload);
  });

  it('rejects a tampered body', () => {
    const token = encodeUnsubscribeToken(payload);
    const [, sig] = token.split('.');
    const forgedBody = Buffer.from(JSON.stringify({ ...payload, personId: '8' })).toString('base64url');
    expect(decodeUnsubscribeToken(`${forgedBody}.${sig}`)).toBeNull();
  });

  it('rejects a tampered signature', () => {
    const token = encodeUnsubscribeToken(payload);
    expect(decodeUnsubscribeToken(`${token.slice(0, -2)}xx`)).toBeNull();
  });

  it('rejects malformed input', () => {
    expect(decodeUnsubscribeToken(null)).toBeNull();
    expect(decodeUnsubscribeToken('')).toBeNull();
    expect(decodeUnsubscribeToken('no-dot-here')).toBeNull();
    expect(decodeUnsubscribeToken('a'.repeat(3000))).toBeNull();
  });

  it('has no expiry: an old token still decodes (emails live in inboxes for months)', () => {
    const token = encodeUnsubscribeToken(payload);
    expect(decodeUnsubscribeToken(token)).not.toBeNull();
  });
});
