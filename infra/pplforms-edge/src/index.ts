/**
 * pplforms-edge — the reverse proxy for `*.pplforms.com` (public tenant surfaces).
 *
 * Runs at the Cloudflare edge in place of a VM. Three jobs:
 *   1. Serve the built Angular SPA (public form `/f/:slug`, event RSVP `/e/:slug`, volunteer
 *      `/v/:slug`) as static assets, with SPA fallback to index.html.
 *   2. Forward the backend's public REST surface (`/api/*`) to the CRM backend unchanged.
 *   3. Serve the server-rendered donation page: rewrite `/d/:slug` → the backend's
 *      `/api/forms/d/:slug` and inject `?t=<org>` from the subdomain (a direct browser navigation to
 *      `/d/:slug` carries no `?t=`, unlike the SPA's `/api` calls which append it themselves).
 *
 * All of this makes every public call **same-origin** on `<org>.pplforms.com`, which is why backend
 * CORS stays locked to the CRM origin (do NOT widen it). See
 * apps/frontend/src/app/shared/public-pages.ts (`apiBase()` returns '' in production;
 * `donationPageUrl()` builds `<org>.pplforms.com/d/:slug`) and
 * apps/backend/src/app/lib/public-tenant.ts (tenant resolves from `?t=` first).
 *
 * The donation page's own links are relative with `?t=` baked in (form action
 * `/api/forms/submit/:slug?t=…`, success redirect `/api/forms/success`), so once it's served here
 * the submit POST and redirect ride the `/api/*` proxy above.
 */

interface Env {
  /** Static-assets binding — the built `dist/apps/frontend/browser` bundle (see wrangler.toml). */
  ASSETS: { fetch: (request: Request) => Promise<Response> };
  /** Backend origin bound on the Container App, e.g. `https://api.pplcrm.com`. */
  BACKEND_ORIGIN: string;
}

/** The org for `<org>.pplforms.com`, or null for the apex / an unexpected host shape. */
function orgFromHost(hostname: string): string | null {
  const parts = hostname.toLowerCase().split('.');
  // `<org>.pplforms.com` → 3+ labels; the left-most label is the org.
  if (parts.length < 3) return null;
  const label = parts[0];
  return label && label !== 'www' ? label : null;
}

/**
 * Map a public request URL to its backend target, or null when it should be served as a static
 * asset instead.
 */
function backendTarget(url: URL, env: Env): string | null {
  // Donation page: /d/:slug → /api/forms/d/:slug, with ?t=<org> injected from the subdomain.
  if (url.pathname.startsWith('/d/')) {
    const params = new URLSearchParams(url.search);
    const org = orgFromHost(url.hostname);
    if (org && !params.has('t')) params.set('t', org);
    const qs = params.toString();
    return `${env.BACKEND_ORIGIN}/api/forms/d/${url.pathname.slice('/d/'.length)}${qs ? `?${qs}` : ''}`;
  }
  // Everything else under /api/* passes through unchanged (the SPA appends its own ?t=).
  if (url.pathname.startsWith('/api/')) {
    return `${env.BACKEND_ORIGIN}${url.pathname}${url.search}`;
  }
  return null;
}

async function proxyToBackend(request: Request, target: string): Promise<Response> {
  const originalHost = new URL(request.url).host;
  const headers = new Headers(request.headers);
  // Drop the inbound Host (`<org>.pplforms.com`) so fetch sets it from the target — the Container
  // App only routes its own bound hostname.
  headers.delete('host');
  headers.set('x-forwarded-host', originalHost); // original public host, for backend logging
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
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const target = backendTarget(url, env);

    // No backend target → the static SPA. `not_found_handling` in wrangler.toml serves index.html
    // for unmatched client routes.
    if (target == null) {
      return env.ASSETS.fetch(request);
    }

    return proxyToBackend(request, target);
  },
};
