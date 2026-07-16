# pplforms-edge

Cloudflare Worker that serves `*.pplforms.com` — the public tenant surfaces (form `/f/:slug`, event
RSVP `/e/:slug`, volunteer `/v/:slug`, donation `/d/:slug`). It replaces what would otherwise be an
nginx VM: it serves the built Angular SPA as static assets **and** reverse-proxies `/api/*` to the
CRM backend so every public API call is same-origin (which is why backend CORS stays locked to the
CRM origin). See [`src/index.ts`](src/index.ts) for the reasoning.

> **Donations are not proxied here.** Donation pages are currently linked directly at
> `api.pplcrm.com/api/forms/d/:slug`, so they don't flow through `*.pplforms.com`. If you want them
> brand-consistent at `<org>.pplforms.com/d/:slug`, add a `/d/` → `/api/forms/d/` rewrite to the
> Worker and repoint the URL builders in `form-view.ts` / `fundraising-form.ts`.

## One-time setup

1. **Add `pplforms.com` as a Cloudflare zone.** Point the registrar's nameservers at the two
   Cloudflare NS. Wait for the zone to show **Active**.
2. **Confirm Universal SSL covers the wildcard.** SSL/TLS → Edge Certificates should list a cert
   for `pplforms.com` and `*.pplforms.com`. Universal SSL covers **one level** only
   (`riverton.pplforms.com` ✓, `a.b.pplforms.com` ✗) — which matches the resolver rejecting nested
   labels. Set the zone's SSL/TLS mode to **Full (strict)**.
3. **Add a proxied wildcard DNS record** so Cloudflare answers for the subdomains and the Worker
   route fires. In the `pplforms.com` zone, DNS → Records:
   - Type `AAAA`, Name `*`, IPv6 `100::` (the discard prefix — traffic never reaches it; the Worker
     intercepts), **Proxied (orange)**.
   - (An `A *` → `192.0.2.1` proxied works equally; the address is a placeholder either way.)
4. **Set the backend base domain.** In the backend's prod environment, set
   `PUBLIC_BASE_DOMAIN=pplforms.com` (frontend `environment.prod.ts` already has
   `publicBaseDomain: 'pplforms.com'`). The `?t=<org>` query is the primary tenant signal, so this
   is a belt-and-suspenders fallback for Host-based resolution.

## Deploy

From this directory:

```bash
# 1. Build the SPA that the Worker serves (outputs ../../dist/apps/frontend/browser)
npx nx build frontend --configuration=production

# 2. Authenticate once (or use CLOUDFLARE_API_TOKEN in CI)
npx wrangler login

# 3. Publish the Worker + upload the static assets + bind the route
npx wrangler deploy
```

> Verify the asset directory after the first build. Angular's application builder emits to
> `dist/apps/frontend/browser`; if your build emits directly to `dist/apps/frontend`, update
> `[assets].directory` in `wrangler.toml`.

Redeploy (`npx wrangler deploy`) on every frontend release — the static assets are uploaded at
deploy time, so a new SPA build isn't live until you redeploy.

## Verify

```bash
# Static SPA (any org subdomain) — expect 200 and the app shell HTML
curl -sSI https://riverton.pplforms.com/f/some-slug | head -n1

# Same-origin API proxy — expect the backend's JSON (404 "Form not found." for a bogus slug on a
# real org, NOT the SPA index.html). Swap `riverton` for a real org subdomain.
curl -sS "https://riverton.pplforms.com/api/forms/f/does-not-exist?t=riverton" | head -c 200; echo
```

If `/api/*` returns the SPA HTML instead of the backend's JSON, `run_worker_first` isn't taking
effect — confirm your `wrangler` version supports it under `[assets]` and that the deploy picked up
`wrangler.toml`.

## Notes

- **Body size:** uploads inherit Cloudflare's 100 MB request-body ceiling; the backend caps
  multipart at 50 MB. The Worker streams the body through (`duplex: 'half'`), so it adds no limit of
  its own.
- **`go.pplcrm.com` (companion apps)** is the same shape — static companion SPA + `/api` proxy — and
  can be a sibling Worker modeled on this one.
