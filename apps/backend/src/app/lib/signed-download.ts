import { createSigner, createVerifier } from 'fast-jwt';
import { env } from '../../env';
import { UnauthorizedError } from '../errors/app-errors';

const DOWNLOAD_SCOPE = 'file-download';
const EMAIL_ATTACHMENT_SCOPE = 'email-attachment';
// Long enough that cached user lists keep rendering avatars, short enough
// that a URL leaked from history or logs goes stale quickly.
const DOWNLOAD_URL_TTL = '24h';

interface SignedDownloadPayload {
  scope: typeof DOWNLOAD_SCOPE;
  file_id: string;
  tenant_id: string;
}

interface SignedEmailAttachmentPayload {
  scope: typeof EMAIL_ATTACHMENT_SCOPE;
  email_id: string;
  tenant_id: string;
}

const signer = createSigner({ algorithm: 'HS256', key: env.sharedSecret, expiresIn: DOWNLOAD_URL_TTL });
const verifier = createVerifier({ algorithms: ['HS256'], key: env.sharedSecret, ignoreExpiration: false });

/**
 * Build a relative download URL carrying a short-lived token scoped to a
 * single file. Safe to embed in <img> tags: unlike a session JWT it cannot
 * be replayed against other endpoints and it expires quickly.
 */
export function signedFileDownloadUrl(fileId: string, tenantId: string): string {
  const st = signer({ scope: DOWNLOAD_SCOPE, file_id: String(fileId), tenant_id: String(tenantId) });
  return `/api/files/download/${fileId}?st=${encodeURIComponent(st)}`;
}

/**
 * Verify a signed download token and confirm it was minted for the file
 * being requested. Throws UnauthorizedError on any mismatch.
 */
export function verifyFileDownloadToken(st: string, fileId: string): SignedDownloadPayload {
  let payload: unknown;
  try {
    payload = verifier(st);
  } catch (err) {
    throw new UnauthorizedError('Unauthorized: Invalid or expired download token', undefined, { cause: err });
  }
  const parsed = payload as Partial<SignedDownloadPayload> | null;
  if (!parsed || parsed.scope !== DOWNLOAD_SCOPE || !parsed.tenant_id || String(parsed.file_id) !== String(fileId)) {
    throw new UnauthorizedError('Unauthorized: Invalid download token');
  }
  return parsed as SignedDownloadPayload;
}

/**
 * Build a relative URL for an email attachment carrying a short-lived token
 * scoped to that one email + tenant. Safe to embed in a link/`<img>`: unlike a
 * session JWT it can't be replayed against other endpoints and expires quickly.
 */
export function signedEmailAttachmentUrl(emailId: string, attachmentId: string, tenantId: string): string {
  const st = signer({ scope: EMAIL_ATTACHMENT_SCOPE, email_id: String(emailId), tenant_id: String(tenantId) });
  return `/api/emails/${emailId}/attachments/${attachmentId}?st=${encodeURIComponent(st)}`;
}

/** As {@link signedEmailAttachmentUrl}, but for an inline (cid) attachment reference. */
export function signedEmailInlineUrl(emailId: string, cid: string, tenantId: string): string {
  const st = signer({ scope: EMAIL_ATTACHMENT_SCOPE, email_id: String(emailId), tenant_id: String(tenantId) });
  return `/api/emails/${emailId}/attachments/cid/${encodeURIComponent(cid)}?st=${encodeURIComponent(st)}`;
}

/**
 * Verify an email-attachment token and confirm it was minted for the email being
 * requested. Throws UnauthorizedError on any mismatch. The specific attachment /
 * cid is then resolved by the route, tenant-scoped, from this token's tenant_id.
 */
export function verifyEmailAttachmentToken(st: string, emailId: string): SignedEmailAttachmentPayload {
  let payload: unknown;
  try {
    payload = verifier(st);
  } catch (err) {
    throw new UnauthorizedError('Unauthorized: Invalid or expired download token', undefined, { cause: err });
  }
  const parsed = payload as Partial<SignedEmailAttachmentPayload> | null;
  if (
    !parsed ||
    parsed.scope !== EMAIL_ATTACHMENT_SCOPE ||
    !parsed.tenant_id ||
    String(parsed.email_id) !== String(emailId)
  ) {
    throw new UnauthorizedError('Unauthorized: Invalid download token');
  }
  return parsed as SignedEmailAttachmentPayload;
}
