---
name: pplcrm-sending-guards
description: "The anti-abuse layer around outbound email and plan enforcement: the pre-send gates in send-guards.ts (verified domain, free-tier phone verification, 7-day warm-up cap), the newsletter preflight content gate (deliverability score 0-100, blocked band refuses the send; preflight.service.ts + libs/common preflight-lint + Claude AI review), the bounce/complaint tripwires that pause or suspend a tenant, the per-tenant hourly send cap in the outbox worker, the FEATURE_MATRIX plan gate (plan-gate.ts + GATED_FEATURES), the disposable-email signup block, the free-tier SendGrid subuser, and the Postmark bounce webhook. USE WHEN a send is blocked/paused/suspended, a 'Deliverability score N' error blocks a send, a tenant hit 'requires the Grassroots plan', changing plan feature gates or send caps/tripwire/preflight thresholds, adding a plan-gated module, un-pausing a tenant, or touching newsletter_send_log / newsletter_content_checks / tenants.sending_paused_at / phone verification. EXAMPLES: 'why can't this free tenant send', 'resume sending for tenant X', 'gate the new module to Movement', 'change the warm-up cap', 'why is this newsletter blocked at score 42'."
---

# Sending guards & plan enforcement (anti-abuse layer)

Added 2026-07-14 to stop free-tier signups being used for spam. Two subsystems: **send guards**
(newsletter sending) and **plan gates** (FEATURE_MATRIX enforcement).

## Send guards — `apps/backend/src/app/modules/newsletters/send-guards.ts`

All constants (caps, rates, messages) live at the top of that file. Enforcement points:

1. **Pre-send** — `assertTenantMaySendNewsletter(db, tenantId, plannedRecipients)` in
   `NewslettersController.sendNewsletter`. Checks, in order:
   - `tenants.suspended_at` set → FORBIDDEN (suspended accounts also can't sign in — auth checks
     the same column).
   - `tenants.sending_paused_at` set → FORBIDDEN (tripwire pause).
   - No DKIM-verified sending domain → PRECONDITION_FAILED. "Verified" = the
     `communications.default_from_email` setting's domain appears in the
     `communications.verified_domains` setting with `status: 'verified'` (the Settings → Domains
     whitelabel flow writes that). Domain verification is available on EVERY plan including
     Free — it's what keeps free-tier mail out of spam, and it's deliberately NOT plan-gated.
     Credential resolution (`settings/controller.ts` `resolveWhitelabelCredentials`) mirrors the
     send path: a tenant-owned SendGrid key wins; otherwise the domain auth + link branding are
     created on the PLATFORM key at the parent level and associated (SendGrid
     `/whitelabel/{domains,links}/{id}/subuser`) with the subuser the tenant sends through (their
     whitelabel subuser, or `SENDGRID_FREE_TIER_SUBUSER` on Free). In platform-key mode a domain
     will not reach `status: 'verified'` until that association succeeds (retried on every verify
     click, tracked as `subuserAssociated` on the entry) — perfect DNS with a failed association
     would still send unsigned mail. What stays paid-only is unrelated to this: custom WEB
     domains (serving pages on the org's own domain instead of `*.pplforms.com`) — not
     implemented yet, and not part of the Domains settings flow.
   - Free plan and `tenants.sending_phone_verified_at` null → PRECONDITION_FAILED. Phone
     verification lives in `settings/controller.ts` (`requestPhoneVerification` /
     `confirmPhoneVerification`, Twilio SMS via `lib/sms`, code hash stored on the tenant row —
     deliberately NOT in settings, whose snapshot is client-readable). UI: Workspace →
     Communications → "Sending phone verification".
   - Free plan and tenant younger than 7 days → warm-up cap: ≤100 emails per rolling 24h
     (`warmupDailyCap`, summed from `newsletter_send_log`).
     1b. **Content gate (newsletter preflight)** — `newsletterPreflight.assertNewsletterContentSendable(db,
   tenantId, newsletterRow)` (`modules/newsletters/preflight.service.ts`), called in
     `NewslettersController.sendNewsletter` directly after `assertTenantMaySendNewsletter`. A
     deliverability score 0–100 is assembled from explainable deductions: the shared deterministic
     lint (`libs/common/src/lib/preflight-lint.ts` — subject patterns, base64/oversize HTML,
     shortener/raw-IP/anchor-mismatch links, image-only bodies) plus a Claude content review
     (`@anthropic-ai/sdk`, `messages.parse` + `zodOutputFormat(AiPreflightVerdictObj)`, model
     `env.anthropicModel` default claude-opus-4-8). Bands live in
     `libs/common/src/lib/schemas/content-check.schema.ts`: `PREFLIGHT_GOOD = 80`,
     `PREFLIGHT_BLOCK = 50`; `score < 50` → PRECONDITION_FAILED ("Deliverability score N — fix the
     items flagged…") on every plan. Results cache in `newsletter_content_checks` keyed
     `(tenant_id, content_hash)` (sha256 over raw subject/html/plainText via `preflightHashInput`) —
     the composer's interactive `newsletters.runPreflight` (lint + Postmark spamcheck + AI, rate
     limited 30/h/tenant) usually pre-populates it, so the send-time gate is a cache hit.
     **Fail-open:** `ANTHROPIC_API_KEY` unset or the API erroring skips the AI layer (lint still
     scores); the Postmark spamcheck runs ONLY in the interactive check, never the send gate (keeps
     tests network-free). AI verdicts `scam_or_phishing` / `pure_commercial_marketing` (confidence
     ≥0.6) carry a 90-point deduction — blocked by construction. Fundraising/auctions/events are
     explicitly allowed in the prompt. **Risk-targeted at the gate:** the send-time AI review runs
     only while a tenant is unproven — free plan always, or `< AI_GATE_FIRST_SENDS` (3) newsletters
     with `status='sent'` on any plan (`aiRequiredAtGate` in `preflight.service.ts`); established
     paid tenants gate on the lint score alone unless a cached interactive check (which always
     includes AI, any plan) covers the content hash. `PreflightResult.aiStatus`:
     'reviewed' | 'unavailable' (wanted, key unset/API error) | 'not_required' (policy). Composer
     UI: score gauge + findings card on Review & send, "Check deliverability" next to Send test
     email.
2. **Per batch, in the worker** — `handleSendNewsletter` (`lib/jobs/handlers/newsletter.handlers.ts`)
   re-loads the tenant every batch:
   - Paused/suspended mid-send → newsletter `status = 'paused'`, resume point saved in
     `newsletters.send_offset`, job ends. A later re-send resumes from `send_offset` instead of
     double-sending (`sendNewsletter` handles `status === 'paused'`).
   - `remainingSendAllowance` (hourly cap per plan + warm-up cap) trims each batch; at 0 it
     enqueues a continuation job (+15 min) and frees the worker slot.
   - Every delivered batch inserts a `newsletter_send_log` row — that table IS the meter; it is
     pruned (30 days) inside the per-tenant loop of `pruneNewsletterEvents`.
3. **Tripwires, in the SendGrid webhook** — `applyEngagementTripwires` runs after each aggregate
   recompute (`newsletters-webhook.route.ts`). On sends ≥20 recipients: hard-bounce rate >5% →
   `pauseTenantSending`; spam-complaint rate >1% → `suspendTenant` (sets `suspended_at`, blocks
   sign-in, pending human review). Both log `[abuse-tripwire]` errors via Pino.

**To un-pause / un-suspend** (support action, no UI): clear `tenants.sending_paused_at` (+
`sending_paused_reason`) or `tenants.suspended_at` in the DB. A paused newsletter is then
re-sent from the UI and resumes at its `send_offset`.

**Website claims:** the 5% bounce / 1% complaint tripwires, the warm-up cap and the
verified-domain requirement are quoted verbatim on the marketing site (EULA §8, security page,
FAQ). The preflight is also stated publicly: the "below 50 cannot send" threshold (security page,
EULA §8 bullet, help articles) and Anthropic in the privacy policy's subprocessor list + the
US-processing residency exception. If you change `PREFLIGHT_BLOCK`, the AI provider, or what the
AI receives, update those pages in the same change — see the `pplcrm-website-claims` skill for
the full registry.

**Reputation isolation:** free-tier sends on the platform SendGrid key default to the
`SENDGRID_FREE_TIER_SUBUSER` env subuser (tenant whitelabel subuser or tenant-owned API key wins).

**Postmark side:** transactional sends attach `Metadata.tenant_id`; the
`/api/postmark/webhook` route (`modules/mail/routes/postmark-webhook.route.ts`, auth =
`X-Postmark-Webhook-Token` header matching `POSTMARK_WEBHOOK_TOKEN`) writes hard bounces /
complaints into `email_suppressions`.

**Signup:** disposable-email domains are rejected in `auth/controller.ts signUp` via
`lib/mail/disposable-email-domains.ts` (curated Set — extend it, don't replace with a huge list).

## Plan gates — `apps/backend/src/app/modules/billing/plan-gate.ts`

`GATED_FEATURES` in `libs/common/src/lib/billing/plans.ts` is the machine-readable core of
FEATURE_MATRIX (keep both in sync): forms/donations/automations/lists/volunteers (staff-side
management: teams, volunteer-events) → `grassroots`+; canvassing/deliveries/companions
(companion-access) → `movement`+. `planFeatureGate(feature)` is a tRPC
middleware that blocks **mutations only** (reads stay open — disclosure over suppression);
gated routers rebind locally:

```ts
import { authProcedure as baseAuthProcedure, router } from '../../../trpc';
import { planFeatureGate } from '../billing/plan-gate';
const authProcedure = baseAuthProcedure.use(planFeatureGate('forms'));
```

`createCrudRouter` accepts the gated procedure as its 4th argument. Gated routers today:
web-forms, donations, workflows, lists, canvassing, deliveries, companion-access, teams,
volunteer-events. Unknown/missing plan values fail closed to `free`.

## Test traps

- Router specs that mock `BaseRepository.dbInstance` with one shared `executeTakeFirst` row must
  include `subscription_plan: 'movement'` in that row, or every mutation dies on the plan gate.
- DB-backed newsletter send tests must seed the tenant on a paid plan **and** the two settings
  rows (`communications.default_from_email` + a `verified` entry in
  `communications.verified_domains`) — see `createTestSeed` in `newsletters/controller.spec.ts`.
- Pure threshold/cap logic (`warmupDailyCap`, `evaluateTripwires`, `planKeyOf`) is unit-tested in
  `send-guards.spec.ts` — extend there, no DB needed.

## Env vars

`SENDGRID_FREE_TIER_SUBUSER` (free-pool subuser), `POSTMARK_WEBHOOK_TOKEN` (webhook auth), plus
the pre-existing `TWILIO_*` (SMS codes; dev-mocks when unset).

`ALLOW_MOCK_DOMAIN_VERIFICATION=true` — local-dev-only opt-in that lets Settings → Domains
auto-pass DNS verification when no valid SendGrid key (tenant-owned or platform
`SENDGRID_API_KEY`) is configured (set in `.env.test` for the
backend suite). Without it, domain verification fails closed: a missing/broken SendGrid key or a
SendGrid API outage leaves records unverified rather than silently opening the sending guards
(`settings/controller.ts` `verifyVerifiedDomain`, `sendgrid-whitelabel.service.ts` validate
fallbacks). Note domain `status: 'verified'` requires SPF + both DKIM records + link branding;
DMARC is recommended but optional and never blocks verification.
