import '@fastify/cookie'; // FastifyReply.setCookie/clearCookie + FastifyRequest.cookies augmentation
import type { FastifyReply, FastifyRequest } from 'fastify';

import { env } from '../../../env';

// The refresh token lives ONLY in this HttpOnly cookie (SECURITY-REVIEW.md 2.1) — never in the
// response body or web storage, so an XSS payload can't read it. The short-lived access token stays
// in the response body / Authorization header and in memory on the client.
export const REFRESH_COOKIE = 'pc_refresh';

// A NON-secret "a session exists" hint, readable by JS on the parent domain (NOT HttpOnly). It lets
// the marketing site (pplcrm.com) tell whether the visitor is signed in to the app (app.pplcrm.com)
// so it can show "Dashboard" instead of "Log in" — without loosening CORS or the HttpOnly refresh
// cookie. It carries no token and no PII: the value is the constant '1'. The refresh cookie above is
// still the only authority; this is a cosmetic hint that always mirrors it (set/cleared together).
export const PRESENCE_COOKIE = 'pc_signed_in';

// Only mark the cookie Secure when the API is actually served over HTTPS; otherwise browsers drop
// Secure cookies on local http dev and every login would silently fail to persist.
const isSecure = env.apiUrl.startsWith('https://');

// Parent domain the presence cookie is scoped to, so app.<domain> and the marketing site at <domain>
// both see it (e.g. `.pplcrm.com`). Omitted in local dev (host-only) — a `localhost` cookie domain is
// invalid and cross-subdomain sharing isn't needed there.
const presenceDomain =
  env.publicBaseDomain && env.publicBaseDomain !== 'localhost' ? `.${env.publicBaseDomain}` : undefined;

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
  // Mirror the session with the readable presence hint (same lifetime).
  res.setCookie(PRESENCE_COOKIE, '1', {
    httpOnly: false, // must be readable by the marketing site's JS — carries no secret
    secure: isSecure,
    sameSite: 'lax',
    path: '/',
    ...(presenceDomain ? { domain: presenceDomain } : {}),
    ...(expiresAt ? { expires: expiresAt } : {}),
  });
}

export function clearRefreshCookie(res: FastifyReply): void {
  res.clearCookie(REFRESH_COOKIE, { path: '/' });
  // Clear with the SAME domain it was set on, or the browser keeps the parent-domain cookie.
  res.clearCookie(PRESENCE_COOKIE, { path: '/', ...(presenceDomain ? { domain: presenceDomain } : {}) });
}
