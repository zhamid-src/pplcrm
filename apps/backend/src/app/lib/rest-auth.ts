import type { FastifyRequest } from 'fastify';

import type { IAuthKeyPayload } from '../../../../../libs/common/src';
import { verifyAuthToken } from './auth-util';
import { BaseRepository } from './base.repo';
import { hashToken } from './token-hash';

/**
 * Shared bearer-token authentication for REST routes.
 *
 * REST routes historically verified the JWT with `verifyAuthToken` directly and
 * did NOT enforce two things the tRPC `isAuthed` middleware does:
 *   1. session revocation — the token's session must still be active/unexpired,
 *      so sign-out / tenant pause / tenant deletion / password reset actually
 *      invalidate the access token immediately (SECURITY-REVIEW.md 1.1); and
 *   2. the viewer-role write guard — read-only `viewer` accounts must not be
 *      able to drive mutating endpoints (SECURITY-REVIEW.md 1.2).
 *
 * Route handlers call this once and branch on the result, keeping control of the
 * HTTP reply so existing response shapes are preserved.
 */
export interface RestAuthContext {
  tenant_id: string;
  user_id: string;
  role: string | null;
  verified: boolean;
}

export type RestAuthResult = { ok: true; auth: RestAuthContext } | { ok: false; status: 401 | 403; error: string };

export interface AuthenticateRestOptions {
  /** Reject read-only `viewer` accounts. Set on mutating endpoints. */
  requireWrite?: boolean;
  /**
   * Also accept the token from `?token=`. Only for the legacy email attachment
   * links; those should migrate to short-lived scoped tokens (SECURITY-REVIEW.md 1.3).
   */
  allowQueryToken?: boolean;
}

function extractToken(req: FastifyRequest, allowQueryToken: boolean): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    const headerToken = authHeader.slice(7).trim();
    if (headerToken) return headerToken;
  }
  if (allowQueryToken) {
    const queryToken = (req.query as { token?: unknown } | undefined)?.token;
    if (typeof queryToken === 'string' && queryToken) return queryToken;
  }
  return null;
}

export async function authenticateRest(
  req: FastifyRequest,
  options: AuthenticateRestOptions = {},
): Promise<RestAuthResult> {
  const token = extractToken(req, options.allowQueryToken ?? false);
  if (!token) {
    return { ok: false, status: 401, error: 'Unauthorized: Missing token' };
  }

  let payload: IAuthKeyPayload;
  try {
    payload = await verifyAuthToken(token);
  } catch {
    return { ok: false, status: 401, error: 'Unauthorized: Invalid or expired token' };
  }

  if (!payload?.tenant_id || !payload?.user_id || !payload?.session_id) {
    return { ok: false, status: 401, error: 'Unauthorized: Invalid token payload' };
  }

  const db = BaseRepository.dbInstance;

  // Confirm the user still exists and read the current role/verified flags.
  const user = await db
    .selectFrom('authusers')
    .select(['role', 'verified'])
    .where('id', '=', payload.user_id)
    .where('tenant_id', '=', payload.tenant_id)
    .executeTakeFirst();
  if (!user) {
    return { ok: false, status: 401, error: 'Unauthorized: User not found' };
  }

  // Session revocation — mirrors the tRPC isAuthed gate.
  const session = await db
    .selectFrom('sessions')
    .select(['id', 'expires_at'])
    .where('session_id', '=', hashToken(payload.session_id))
    .where('user_id', '=', payload.user_id)
    .where('tenant_id', '=', payload.tenant_id)
    .where('status', '=', 'active')
    .executeTakeFirst();
  if (!session) {
    return { ok: false, status: 401, error: 'Unauthorized: Session expired' };
  }
  if (session.expires_at && new Date(session.expires_at).getTime() < Date.now()) {
    return { ok: false, status: 401, error: 'Unauthorized: Session expired' };
  }

  const role = user.role ?? null;
  const verified = user.verified === true || String(user.verified) === 'true';

  if (options.requireWrite && role === 'viewer') {
    return { ok: false, status: 403, error: 'Viewers are not allowed to make changes.' };
  }

  return { ok: true, auth: { tenant_id: payload.tenant_id, user_id: payload.user_id, role, verified } };
}
