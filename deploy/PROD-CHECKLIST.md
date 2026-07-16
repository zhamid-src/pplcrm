# pplCRM Production Go-Live Checklist

Target stack: **Azure** (Container Apps API + edge VM + Postgres + Blob, Canada Central) + **Cloudflare** (DNS, TLS, Pages).
Full rationale in `~/.claude/plans/deployment-plan-we-had-indexed-fox.md`. Work top to bottom.

Origins: `pplcrm.com` (marketing) · `app.pplcrm.com` (CRM) · `api.pplcrm.com` (backend) ·
`go.pplcrm.com` (companion) · `*.pplforms.com` (per-org public forms/events/donations).

---

## 0. Accounts & tooling

- [ ] Azure subscription with permission to create resources in **Canada Central**.
- [ ] Cloudflare account (Free is fine) managing DNS for `pplcrm.com` **and** `pplforms.com` (register `pplforms.com` if not owned).
- [x] Decide the `*.pplforms.com` origin — **DECIDED 2026-07-15: Option B, consolidated** — one small VM runs the
      edge Caddy for all three edge hosts and the `pplcrm-edge` Container App is not created (see §1/§3).
- [ ] GitHub repo admin (to set Actions secrets/variables and GHCR package visibility).
- [ ] Local tooling: `az` CLI, `docker`, `git`. (Decide: GitHub-runner deploy vs. hand-run.)
- [ ] Decide the companion subdomain name — plan uses `go.pplcrm.com` (rename in `environment.prod.ts` if different).

## 1. Domains & DNS (Cloudflare)

**Cloudflare Free is sufficient to launch.** The paid tiers (Pro/Business/Enterprise) sell security/perf
hardening (WAF, bot management, rate limiting, advanced DDoS, SLA) — nice later, not required. Free gives
DNS, Pages, Universal SSL, proxied CDN, and basic DDoS.

The three single subdomains are normal proxied records (Universal SSL covers them on Free):

- [ ] `pplcrm.com` (apex + `www`) → Cloudflare Pages (marketing).
- [ ] `api.pplcrm.com` → **proxied** (orange) CNAME to the `pplcrm-api` Container App FQDN.
- [ ] `app.pplcrm.com` → **proxied** (orange) A record to the edge VM's static IP (§3).
- [ ] `go.pplcrm.com` → **proxied** (orange) A record to the edge VM's static IP.
- [ ] For the proxied records above, set SSL/TLS mode to **Full (strict)** (Cloudflare validates the origin cert).

**`*.pplforms.com` (per-org tenant subdomains) — the one that needs a real decision.** (Facts re-verified
2026-07-15 against current Cloudflare/Azure docs.) Cloudflare **proxies wildcard records on ALL plans**
(since Sept 2021 — "Wildcard proxy for everyone"), and Free's **Universal SSL already covers `*.pplforms.com`**
(first-level wildcard) — no Advanced Certificate Manager needed. The real constraint is the **origin**:
Azure Container Apps custom domains are exact-hostname-only (no wildcard bindings; the env "custom DNS suffix"
routes `<app-name>.suffix` by app name, which doesn't fit tenant slugs), so wildcard traffic can't land on the
ACA edge directly. **DECIDED 2026-07-15 — Option B, consolidated:** one small VM runs the edge Caddy for
**all three** edge hosts (`app.` / `go.` / `*.pplforms.com`) and the `pplcrm-edge` Container App is not created.
Rationale: an always-on min-1-replica Container App bills ~US$10–15/mo — more than the VM — so consolidating is
both the cheapest workable topology (~US$13–16/mo all-in vs ~$27 split VM+ACA, ~$49 Front Door) and removes a
runtime. Everything stays on Cloudflare Free.

- [ ] `*.pplforms.com` → **proxied** (orange) A record to the edge VM's static IP.
- [ ] Caddy presents free **Cloudflare Origin CA** certs (one per zone: `pplcrm.com` + `*.pplcrm.com`, and
      `pplforms.com` + `*.pplforms.com`; up to 15-yr validity, satisfies Full (strict), no renewal automation).
      Let's Encrypt via DNS-01 (`tls { dns cloudflare … }`) stays the fallback if a publicly-trusted cert is ever needed.
- [ ] Confirm the edge receives the original `Host` so `<org>.pplforms.com` resolves the tenant via `?t=`
      (Cloudflare's proxy passes Host through unchanged, so the Caddyfile site matchers work as-is).

Not chosen (recorded so the decision isn't relitigated from stale facts):
**Option A — Azure Front Door** (Standard ~US$35/mo base + egress) supports wildcard domains with managed
wildcard certs (GA June 2025, TXT validation) but layers a second CDN behind Cloudflare and needs Host-header
surgery for ACA ingress (Caddy would only see the tenant host via `X-Forwarded-Host`). Revisit if the VM
outgrows its duty. **$0 alternative — Cloudflare Workers static-assets edge** (static requests free; `/api`+`/d`
proxy invocations within the 100k/day free tier) is the long-term cost floor, but replaces the Caddy edge and
the deploy pipeline — rejected pre-launch; revisit as a cost cut once live.

## 2. Azure — data layer

- [ ] Create **Azure Database for PostgreSQL Flexible Server** in Canada Central; note host/port.
- [ ] Create the `pplcrm` database.
- [ ] Run `apps/backend/scripts/setup-db-roles.sql` **as a superuser**, substituting `:owner_pw`,
      `:app_pw`, `:current_owner` → creates `pplcrm_owner` (DDL/migrations) and `pplcrm_app` (runtime, RLS-bound).
- [ ] Confirm the runtime role is **`pplcrm_app`**, never the owner (RLS depends on it).
- [ ] Configure Postgres firewall/VNet so (a) the Container Apps env and (b) the migrate runner can reach it.
- [ ] Create the **Azure Blob** storage account + `uploads` container in Canada Central; grab the connection string.
- [ ] (Optional) tighten the Blob container CORS from the code's default `*`.

## 3. Azure — compute

- [ ] Create a **Container Apps environment** in Canada Central (hosts only `pplcrm-api` — the edge is a VM, per §1).
- [ ] Create app **`pplcrm-api`** (backend): ingress external, **targetPort 3000**, min 1 / max 1 replica to start.
- [ ] Bind the custom domain `api.pplcrm.com` on `pplcrm-api` (managed cert) so Full (strict) validates.
- [ ] Set liveness probe → `GET /` and readiness probe → `GET /healthz` on `pplcrm-api`.
- [ ] Grant the Container App access to pull from **GHCR** (registry credentials / managed identity).

Edge VM (replaces the `pplcrm-edge` Container App — §1 decision):

- [ ] Create a small VM (e.g. B2ats v2 / B1s) in Canada Central with a **Standard static public IP**; install Docker.
- [ ] NSG: allow 443 **only from Cloudflare IP ranges** (<https://www.cloudflare.com/ips/>) + SSH from your own IP.
- [ ] Create the two **Cloudflare Origin CA** certs (§1) and place them on the VM for the container to mount.
- [ ] Update `deploy/Caddyfile` for VM duty: serve **:443** with the Origin CA certs (drop `auto_https off`; same
      three site blocks). `reverse_proxy` upstream becomes the `pplcrm-api` **external** FQDN over HTTPS with
      `header_up Host {upstream_hostport}` (ACA ingress routes by Host; the tenant host still reaches the backend
      via `X-Forwarded-Host`, which Fastify honors under `TRUST_PROXY` — verify `/d/<slug>` resolution in §8).
- [ ] Run the GHCR `edge` image with `--restart unless-stopped`, certs mounted, `BACKEND_UPSTREAM` set.

## 4. Secrets & config

Set the backend env on `pplcrm-api` (from `.env.production.example`). Required first:

- [ ] `SHARED_SECRET` (generate, e.g. `openssl rand -base64 48`).
- [ ] `OAUTH_TOKEN_ENC_KEY` (generate — REQUIRED if any real mailbox is connected; else tokens store plaintext).
- [ ] DB: `DB_HOST`, `DB_PORT`, `DB_NAME=pplcrm`, `DB_USER=pplcrm_app`, `DB_PASSWORD`, `DB_SSL=true`.
- [ ] `DB_MIGRATION_USER=pplcrm_owner`, `DB_MIGRATION_PASSWORD` (used only by the migrate step).
- [ ] Origins: `NODE_ENV=production`, `HOST=0.0.0.0`, `PORT=3000`, `API_URL=https://api.pplcrm.com`,
      `APP_URL=https://app.pplcrm.com`, `PUBLIC_BASE_DOMAIN=pplforms.com`, `TRUST_PROXY=1`.
- [ ] `MIGRATE_ON_BOOT=false`.
- [ ] Blob: `AZURE_STORAGE_CONNECTION_STRING`, `AZURE_STORAGE_CONTAINER=uploads`.
- [ ] **Confirm `ALLOW_MOCK_PAYMENTS` is NOT set** anywhere (would accept forged payments).
- [ ] Integration keys (mock silently if unset): Stripe (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`,
      `STRIPE_PLAN_GRASSROOTS_PRICE_ID`, `STRIPE_PLAN_MOVEMENT_PRICE_ID`), Postmark
      (`POSTMARK_SERVER_TOKEN`, `POSTMARK_FROM_EMAIL`, `POSTMARK_WEBHOOK_TOKEN`), SendGrid
      (`SENDGRID_API_KEY`, `SENDGRID_WEBHOOK_VERIFICATION_KEY`, `SENDGRID_FREE_TIER_SUBUSER`), Twilio
      (`TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER`), Google (`GOOGLE_MAPS_API_KEY`,
      `GOOGLE_CLIENT_ID/SECRET`, `GOOGLE_REDIRECT_URI=https://api.pplcrm.com/auth/google/callback`),
      Microsoft (`MS_CLIENT_ID/SECRET`, `MS_TENANT_ID`, `MS_REDIRECT_URI=https://api.pplcrm.com/auth/ms/callback`).

GitHub Actions (for the CI pipeline in `.github/workflows/deploy.yml`):

- [ ] Secrets: `VITE_GOOGLE_MAPS_API_KEY`, `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_MIGRATION_USER`,
      `DB_MIGRATION_PASSWORD`, `SHARED_SECRET`, `AZURE_CREDENTIALS`, `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`.
- [ ] Variables: `AZURE_RESOURCE_GROUP=pplcrm-cad-prod`, `AZURE_API_APP=pplcrm-api`, `AZURE_EDGE_VM=<vm name>`, `CF_PAGES_PROJECT`.
- [ ] Update `.github/workflows/deploy.yml` for the §1 decision: the edge step becomes `az vm run-command invoke`
      (docker pull + restart) on `AZURE_EDGE_VM` instead of `az containerapp update` on a `pplcrm-edge` app.
- [ ] Ensure the **migrate job's runner can reach Postgres** (public endpoint + firewall allow, or self-hosted runner in the VNet).
- [ ] `VITE_GOOGLE_MAPS_API_KEY` restricted by HTTP referrer at Google (it ships to the browser).

## 5. First deploy

- [ ] Create the Cloudflare **Pages** project for the marketing site (`CF_PAGES_PROJECT`), custom domain `pplcrm.com`.
- [ ] Push `feat/production-deployment` and open/merge the PR (workflow triggers on `main`), **or** run each step by hand:
  - [ ] `npx nx run-many -t build -p backend frontend companion website --configuration=production` (with `VITE_GOOGLE_MAPS_API_KEY`).
  - [ ] Build & push images: `apps/backend/Dockerfile` → GHCR `backend`; `deploy/Caddy.Dockerfile` → GHCR `edge`.
  - [ ] **Migrate** as owner: `npx tsx apps/backend/src/app/kyselyinit.ts` with `DB_MIGRATION_*` env (from repo root).
  - [ ] `az containerapp update` `pplcrm-api` to the new image tag; edge VM: `az vm run-command invoke` (docker pull + restart).
  - [ ] `wrangler pages deploy dist/apps/website --project-name=<CF_PAGES_PROJECT>`.

## 6. Register with third-party providers (first launch)

All webhook/redirect URLs are on **`api.pplcrm.com`**:

- [ ] Stripe billing webhook → `POST /api/billing/webhook` (secret = `STRIPE_WEBHOOK_SECRET`).
- [ ] Stripe donations webhook (per tenant) → `POST /api/donations/webhook?token=<tenant-token>`.
- [ ] Helcim donations webhook (per tenant) → `POST /api/donations/helcim-webhook?token=<tenant-token>`.
- [ ] Postmark bounce/complaint webhook → `POST /api/postmark/webhook` (header `X-Postmark-Webhook-Token`).
- [ ] SendGrid signed-event webhook → `POST /api/newsletters/webhook`.
- [ ] Google OAuth: add redirect `https://api.pplcrm.com/auth/google/callback` in Google Cloud console.
- [ ] Microsoft OAuth: add redirect `https://api.pplcrm.com/auth/ms/callback` in the Azure app registration.
- [ ] Verify sending domains (SPF/DKIM) in Postmark + SendGrid for your from-addresses.

## 7. App-level / per-tenant config

- [ ] Decide & document the **data-residency** posture (Canada-only v1 recommended — matches Helcim=CAD).
- [ ] Per-tenant donation setup happens in-app: processor keys (Stripe/Helcim) + `donations.residency_acknowledged`
      (donations are **fail-closed** until acknowledged).
- [ ] Per-tenant sending: `communications.sendgrid_api_key` + verified domains (in-app).

## 8. Verification (smoke test after deploy)

- [ ] `curl https://api.pplcrm.com/healthz` → 200 `{status:"ok"}` (DB reachable); `GET /` → 200.
- [ ] `https://app.pplcrm.com` loads; sign up a throwaway tenant; verify email actually arrives (Postmark).
- [ ] Cross-origin works: CRM (app.) reaches tRPC (api.) — you're logged in and data loads.
- [ ] `https://<org>.pplforms.com/f/<slug>` loads a public form; submit it (confirms wildcard DNS/TLS + `?t=` tenant resolution).
- [ ] `https://go.pplcrm.com/t/<token>` (or `/r/<token>`) loads with no asset 404s.
- [ ] `https://<org>.pplforms.com/d/<slug>` renders donation checkout; unacknowledged-residency tenant is blocked (412).
- [ ] A map view shows real tiles (not grey) — confirms `VITE_GOOGLE_MAPS_API_KEY`.
- [ ] Fire a Stripe test event + a Postmark test bounce → rows land in `webhook_events` / `email_suppressions` and drain.
- [ ] `https://pplcrm.com` loads; "Log in" deep-links to `https://app.pplcrm.com/signin`; `/api/geo-rates` returns a region.
- [ ] Logs are production JSON (not pino-pretty); `NODE_ENV=production`.

## 9. Post-launch / operations

- [ ] Confirm the in-process worker/cron is running (background jobs draining; no stuck `background_jobs`).
- [ ] Set up alerting on `/healthz` failures, Container App restarts, and DB connection saturation
      (keep `DB_POOL_MAX` under Postgres `max_connections`).
- [ ] Verify DB backups / point-in-time restore are enabled on the Flexible Server.
- [ ] Establish the migration workflow going forward: **new timestamped migration files only**, never edit applied ones.
- [ ] Plan secret rotation (`SHARED_SECRET`, `OAUTH_TOKEN_ENC_KEY` — rotating the latter forces mailbox re-consent).
- [ ] Decide scale-out policy (safe via `SELECT … FOR UPDATE SKIP LOCKED`, but start at 1 replica).
