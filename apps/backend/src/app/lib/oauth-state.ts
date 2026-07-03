import { createHmac, timingSafeEqual } from 'crypto';

import { env } from '../../env';

// OAuth `state` must be unforgeable: it is the ONLY thing that binds the
// mailbox being connected to a specific (userId, tenantId). If it is not
// authenticated, an attacker can craft an authorization URL whose state points
// at their own account, trick a victim into authorizing, and have the victim's
// mailbox tokens stored under the attacker's user — a full account takeover.
// We therefore HMAC-sign the state with the server secret and give it a short
// TTL so a leaked/observed value cannot be replayed indefinitely.

const STATE_TTL_MS = 10 * 60 * 1000; // 10 minutes

export interface OAuthStatePayload {
  userId: string;
  tenantId: string;
  returnTo?: string;
}

interface SignedStateBody extends OAuthStatePayload {
  iat: number;
}

function sign(data: string): string {
  return createHmac('sha256', env.sharedSecret).update(data).digest('base64url');
}

/** Produce a signed, tamper-proof state string for an OAuth authorization URL. */
export function encodeOAuthState(payload: OAuthStatePayload): string {
  const body: SignedStateBody = { ...payload, iat: Date.now() };
  const data = Buffer.from(JSON.stringify(body)).toString('base64url');
  return `${data}.${sign(data)}`;
}

/**
 * Verify and decode a state string returned to an OAuth callback.
 * Returns `null` if the signature is missing/invalid, the payload is malformed,
 * or the state has expired — callers MUST treat null as an invalid request.
 */
export function decodeOAuthState(raw: string | undefined | null): OAuthStatePayload | null {
  if (!raw || typeof raw !== 'string') return null;

  const dot = raw.lastIndexOf('.');
  if (dot <= 0) return null;

  const data = raw.slice(0, dot);
  const providedSig = raw.slice(dot + 1);
  const expectedSig = sign(data);

  const a = Buffer.from(providedSig);
  const b = Buffer.from(expectedSig);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  let parsed: SignedStateBody;
  try {
    parsed = JSON.parse(Buffer.from(data, 'base64url').toString('utf8'));
  } catch {
    return null;
  }

  if (!parsed || typeof parsed.iat !== 'number') return null;
  if (Date.now() - parsed.iat > STATE_TTL_MS) return null;
  if (!parsed.userId || !parsed.tenantId) return null;

  return { userId: parsed.userId, tenantId: parsed.tenantId, returnTo: parsed.returnTo };
}
