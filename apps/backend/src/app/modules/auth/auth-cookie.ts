import '@fastify/cookie'; // FastifyReply.setCookie/clearCookie + FastifyRequest.cookies augmentation
import type { FastifyReply, FastifyRequest } from 'fastify';

import { env } from '../../../env';

// The refresh token lives ONLY in this HttpOnly cookie (SECURITY-REVIEW.md 2.1) — never in the
// response body or web storage, so an XSS payload can't read it. The short-lived access token stays
// in the response body / Authorization header and in memory on the client.
export const REFRESH_COOKIE = 'pc_refresh';

// Only mark the cookie Secure when the API is actually served over HTTPS; otherwise browsers drop
// Secure cookies on local http dev and every login would silently fail to persist.
const isSecure = env.apiUrl.startsWith('https://');

export function getRefreshTokenFromCookie(req: FastifyRequest): string | undefined {
  const value = req.cookies?.[REFRESH_COOKIE];
  return value ? value : undefined;
}

/**
 * Persist the refresh token in the HttpOnly cookie. `expiresAt` pins the cookie to the DB session's
 * expiry (remember-me → 30 days); when null it becomes a session cookie that dies with the browser.
 * The DB session is always the real authority — the cookie is just the carrier.
 */
export function setRefreshCookie(res: FastifyReply, refreshToken: string, expiresAt: Date | null): void {
  res.setCookie(REFRESH_COOKIE, refreshToken, {
    httpOnly: true,
    secure: isSecure,
    sameSite: 'lax', // sent on same-site XHR + top-level nav; CORS (env.appUrl only) blocks cross-site reads
    path: '/',
    ...(expiresAt ? { expires: expiresAt } : {}),
  });
}

export function clearRefreshCookie(res: FastifyReply): void {
  res.clearCookie(REFRESH_COOKIE, { path: '/' });
}
