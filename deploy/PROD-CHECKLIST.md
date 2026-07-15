# pplCRM Production Go-Live Checklist

Target stack: **Azure** (Container Apps + Postgres + Blob, Canada Central) + **Cloudflare** (DNS, TLS, Pages).
Full rationale in `~/.claude/plans/deployment-plan-we-had-indexed-fox.md`. Work top to bottom.

Origins: `pplcrm.com` (marketing) · `app.pplcrm.com` (CRM) · `api.pplcrm.com` (backend) ·
`go.pplcrm.com` (companion) · `*.pplforms.com` (per-org public forms/events/donations).

---

## 0. Accounts & tooling

- [ ] Azure subscription with permission to create resources in **Canada Central**.
- [ ] Cloudflare account (Free is fine) managing DNS for `pplcrm.com` **and** `pplforms.com` (register `pplforms.com` if not owned).
- [ ] Decide how `*.pplforms.com` TLS is served (see §1 — Azure Front Door or a VM-hosted edge with DNS-01; NOT a Cloudflare proxied wildcard, which is Enterprise-only).
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
- [ ] `app.pplcrm.com` → **proxied** (orange) CNAME to the `pplcrm-edge` Container App FQDN.
- [ ] `go.pplcrm.com` → **proxied** (orange) CNAME to the `pplcrm-edge` Container App FQDN.
- [ ] For the proxied records above, set SSL/TLS mode to **Full (strict)** (Cloudflare validates the Azure origin cert).

**`*.pplforms.com` (per-org tenant subdomains) — the one that needs a real decision.** Cloudflare only
**proxies wildcard DNS records on Enterprise**; on Free/Pro/Business a `*` record is forced **DNS-only**
(grey cloud), so Cloudflare won't terminate TLS/CDN it — and Azure Container Apps doesn't support wildcard
custom domains either. Upgrading to Pro/Business does NOT fix this (proxied wildcards are Enterprise-only).
Pick one Free-compatible path — the edge terminates its own wildcard TLS:

- [ ] **Option A — Azure Front Door:** point `*.pplforms.com` (Cloudflare **DNS-only** CNAME) at Front Door,
      which supports wildcard domains + managed wildcard TLS and forwards to the edge/backend.
- [ ] **Option B — edge Caddy on an Azure VM/VMSS:** `*.pplforms.com` (Cloudflare **DNS-only** A/CNAME) → the VM;
      Caddy mints a `*.pplforms.com` Let's Encrypt cert via **DNS-01 using a Cloudflare API token** (uncomment the
      `tls { dns cloudflare … }` block in `deploy/Caddyfile` and drop `auto_https off`). Everything stays on Cloudflare Free.
- [ ] (Either way) confirm the edge receives the original `Host` so `<org>.pplforms.com` resolves the tenant via `?t=`.

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

- [ ] Create a **Container Apps environment** in Canada Central.
- [ ] Create app **`pplcrm-api`** (backend): ingress external, **targetPort 3000**, min 1 / max 1 replica to start.
- [ ] Create app **`pplcrm-edge`** (Caddy): ingress external, **targetPort 80**.
- [ ] Point `BACKEND_UPSTREAM` (edge env) at the internal `pplcrm-api` FQDN, e.g. `pplcrm-api:3000`.
- [ ] Bind custom domains on the Container Apps (or let Cloudflare front them — see the §1 caveat).
- [ ] Set liveness probe → `GET /` and readiness probe → `GET /healthz` on `pplcrm-api`.
- [ ] Grant the Container Apps access to pull from **GHCR** (registry credentials / managed identity).

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
- [ ] Variables: `AZURE_RESOURCE_GROUP`, `AZURE_API_APP=pplcrm-api`, `AZURE_EDGE_APP=pplcrm-edge`, `CF_PAGES_PROJECT`.
- [ ] Ensure the **migrate job's runner can reach Postgres** (public endpoint + firewall allow, or self-hosted runner in the VNet).
- [ ] `VITE_GOOGLE_MAPS_API_KEY` restricted by HTTP referrer at Google (it ships to the browser).

## 5. First deploy

- [ ] Create the Cloudflare **Pages** project for the marketing site (`CF_PAGES_PROJECT`), custom domain `pplcrm.com`.
- [ ] Push `feat/production-deployment` and open/merge the PR (workflow triggers on `main`), **or** run each step by hand:
  - [ ] `npx nx run-many -t build -p backend frontend companion website --configuration=production` (with `VITE_GOOGLE_MAPS_API_KEY`).
  - [ ] Build & push images: `apps/backend/Dockerfile` → GHCR `backend`; `deploy/Caddy.Dockerfile` → GHCR `edge`.
  - [ ] **Migrate** as owner: `npx tsx apps/backend/src/app/kyselyinit.ts` with `DB_MIGRATION_*` env (from repo root).
  - [ ] `az containerapp update` both apps to the new image tags.
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
