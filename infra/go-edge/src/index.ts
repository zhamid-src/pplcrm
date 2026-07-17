/**
 * go-edge — the reverse proxy for `go.pplcrm.com` (the volunteer companion app).
 *
 * Runs at the Cloudflare edge. Two jobs:
 *   1. Serve the built companion Angular SPA (`/t/:token` canvass, `/r/:token` deliveries) as static
 *      assets, with SPA fallback to index.html.
 *   2. Forward the companion's backend surface (`/api/*`) to the CRM backend unchanged.
 *
 * This makes every companion call **same-origin** on `go.pplcrm.com`, which is why backend CORS
 * stays locked to the CRM origin (do NOT widen it). The companion resolves its tenant from the
 * opaque token in the path (see apps/backend/src/app/modules/companion-access), so — unlike the
 * pplforms forms surface — there is no `?t=<org>` injection and no `/d/` donation rewrite here.
 */

interface Env {
  /** Static-assets binding — the built `dist/apps/companion/browser` bundle (see wrangler.toml). */
  ASSETS: { fetch: (request: Request) => Promise<Response> };
  /** Backend origin bound on the Container App, e.g. `https://api.pplcrm.com`. */
  BACKEND_ORIGIN: string;
}

async function proxyToBackend(request: Request, target: string): Promise<Response> {
  const originalHost = new URL(request.url).host;
  const headers = new Headers(request.headers);
  // Drop the inbound Host (go.pplcrm.com) so fetch sets it from the target — the Container App only
  // routes its own bound hostname.
  headers.delete('host');
  headers.set('x-forwarded-host', originalHost);
  headers.set('x-forwarded-proto', 'https');

  const init: RequestInit = {
    method: request.method,
    headers,
    redirect: 'manual',
  };
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    init.body = request.body;
    (init as RequestInit & { duplex: 'half' }).duplex = 'half';
  }

  return fetch(target, init);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Companion backend surface → proxy unchanged. Everything else is the static SPA.
    if (url.pathname.startsWith('/api/')) {
      return proxyToBackend(request, `${env.BACKEND_ORIGIN}${url.pathname}${url.search}`);
    }

    return env.ASSETS.fetch(request);
  },
};
