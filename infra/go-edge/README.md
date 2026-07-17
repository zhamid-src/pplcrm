# go-edge

Cloudflare Worker that serves `go.pplcrm.com` — the volunteer **companion** app (canvass `/t/:token`,
deliveries `/r/:token`). It replaces what would otherwise be an nginx VM: it serves the built
companion Angular SPA as static assets and reverse-proxies `/api/*` to the CRM backend. Every
companion call is same-origin, which is why backend CORS stays locked to the CRM origin. See
[`src/index.ts`](src/index.ts) for the reasoning.

Unlike [`pplforms-edge`](../pplforms-edge), this is a **single host** (no per-org subdomain), so
there is no `?t=<org>` injection and no `/d/` donation rewrite — the companion resolves its tenant
from the opaque token in the path.

## One-time setup

1. **Add a proxied DNS record** so Cloudflare answers for `go.pplcrm.com` and the Worker route
   fires. In the `pplcrm.com` zone, DNS → Records:
   - Type `AAAA`, Name `go`, IPv6 `100::` (the discard prefix — traffic never reaches it; the Worker
     intercepts), **Proxied (orange)**.
   - (An `A go` → `192.0.2.1` proxied works equally; the address is a placeholder either way.)
2. **Confirm Universal SSL covers `go.pplcrm.com`.** SSL/TLS → Edge Certificates; set the zone's
   SSL/TLS mode to **Full (strict)** (the backend's `api.pplcrm.com` managed cert satisfies it).

## Deploy

From this directory:

```bash
# 1. Build the SPA that the Worker serves (outputs ../../dist/apps/companion/browser)
npx nx build companion --configuration=production

# 2. Authenticate once (or use CLOUDFLARE_API_TOKEN in CI)
npx wrangler login

# 3. Publish the Worker + upload the static assets + bind the route
npx wrangler deploy
```

In CI this runs from the `deploy` job via `cloudflare/wrangler-action` after the companion bundle is
downloaded into `dist/apps/companion/browser`. The `CLOUDFLARE_API_TOKEN` needs **Workers Scripts:
Edit** plus **Account → Workers Routes: Edit** on the `pplcrm.com` zone.
