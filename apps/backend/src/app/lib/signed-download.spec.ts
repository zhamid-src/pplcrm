import { describe, it, expect, beforeAll } from 'vitest';

// The signed-download helpers read env.sharedSecret at import time.
beforeAll(() => {
  process.env['SHARED_SECRET'] ??= 'test-shared-secret';
});

describe('email-attachment scoped tokens (SECURITY-REVIEW.md 1.3)', () => {
  it('round-trips a token scoped to the right email + tenant', async () => {
    const { signedEmailAttachmentUrl, verifyEmailAttachmentToken } = await import('./signed-download');

    const url = signedEmailAttachmentUrl('42', '7', 'tenant-1');
    const st = new URL(`http://x${url}`).searchParams.get('st');
    expect(st).toBeTruthy();

    const payload = verifyEmailAttachmentToken(st as string, '42');
    expect(payload.tenant_id).toBe('tenant-1');
    expect(payload.email_id).toBe('42');
  });

  it('rejects a token minted for a different email', async () => {
    const { signedEmailAttachmentUrl, verifyEmailAttachmentToken } = await import('./signed-download');

    const url = signedEmailAttachmentUrl('42', '7', 'tenant-1');
    const st = new URL(`http://x${url}`).searchParams.get('st') as string;

    expect(() => verifyEmailAttachmentToken(st, '99')).toThrow();
  });

  it('rejects a file-download token used as an attachment token (scope isolation)', async () => {
    const { signedFileDownloadUrl, verifyEmailAttachmentToken } = await import('./signed-download');

    const url = signedFileDownloadUrl('42', 'tenant-1'); // scope: file-download
    const st = new URL(`http://x${url}`).searchParams.get('st') as string;

    expect(() => verifyEmailAttachmentToken(st, '42')).toThrow();
  });

  it('rejects a tampered/garbage token', async () => {
    const { verifyEmailAttachmentToken } = await import('./signed-download');
    expect(() => verifyEmailAttachmentToken('not-a-jwt', '42')).toThrow();
  });
});
