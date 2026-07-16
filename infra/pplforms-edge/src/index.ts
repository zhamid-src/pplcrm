/**
 * pplforms-edge — the reverse proxy for `*.pplforms.com` (public tenant surfaces).
 *
 * Runs at the Cloudflare edge in place of a VM. Two jobs:
 *   1. Serve the built Angular SPA (public form `/f/:slug`, event RSVP `/e/:slug`, volunteer
 *      `/v/:slug`) as static assets, with SPA fallback to index.html.
 *   2. Forward the backend's public REST surface (`/api/*`) to the CRM backend so the browser sees
 *      every call as SAME-ORIGIN.
 *
 * NOTE on donations: donation pages are currently linked directly at `api.pplcrm.com/api/forms/d/…`
 * (see form-view.ts / fundraising-form.ts), so they do NOT flow through this proxy today. If they
 * move to `<org>.pplforms.com/d/:slug` for brand consistency, add a `/d/` → `/api/forms/d/` rewrite
 * here AND repoint those URL builders. Until then, `/d` is intentionally not proxied.
 *
 * Why same-origin matters: backend CORS is deliberately pinned to the single CRM origin
 * (apps/backend/src/fastify.server.ts) with credentials. Public pages never make a cross-origin
 * call precisely because this proxy makes `/api` look local — see
 * apps/frontend/src/app/shared/public-pages.ts (`apiBase()` returns '' in production).
 *
 * Tenant is carried in the `?t=<org>` query the SPA appends from its own subdomain
 * (`tenantQuery()`), so rewriting the Host header on the way to the backend is safe — the backend
 * resolves the tenant from `?t=` first (apps/backend/src/app/lib/public-tenant.ts).
 */

interface Env {
  /** Static-assets binding — the built `dist/apps/frontend/browser` bundle (see wrangler.toml). */
  ASSETS: { fetch: (request: Request) => Promise<Response> };
  /** Backend origin bound on the Container App, e.g. `https://api.pplcrm.com`. */
  BACKEND_ORIGIN: string;
}

/** Path prefixes that must reach the backend, not the static bundle. */
const BACKEND_PREFIXES = ['/api/'] as const;

function isBackendPath(pathname: string): boolean {
  return BACKEND_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Everything that isn't the backend surface is the static SPA. `not_found_handling` in
    // wrangler.toml serves index.html for unmatched client routes.
    if (!isBackendPath(url.pathname)) {
      return env.ASSETS.fetch(request);
    }

    // Same-origin proxy to the backend's public REST surface.
    const target = `${env.BACKEND_ORIGIN}${url.pathname}${url.search}`;
    const headers = new Headers(request.headers);
    // Drop the inbound Host (`<org>.pplforms.com`) so fetch sets it from BACKEND_ORIGIN — the
    // Container App only routes its own bound hostname.
    headers.delete('host');
    // Preserve the original public host for backend logging / auditing.
    headers.set('x-forwarded-host', url.host);
    headers.set('x-forwarded-proto', 'https');

    const init: RequestInit = {
      method: request.method,
      headers,
      // Preserve backend 3xx (e.g. donation redirects to the payment provider) verbatim.
      redirect: 'manual',
    };
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      init.body = request.body;
      // Required by the Streams spec when a request body is a ReadableStream.
      (init as RequestInit & { duplex: 'half' }).duplex = 'half';
    }

    return fetch(target, init);
  },
};
