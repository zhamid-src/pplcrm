---
name: pplcrm-sending-guards
description: "The anti-abuse layer around outbound email and plan enforcement: the pre-send gates in send-guards.ts (verified domain, free-tier phone verification, 7-day warm-up cap), the bounce/complaint tripwires that pause or suspend a tenant, the per-tenant hourly send cap in the outbox worker, the FEATURE_MATRIX plan gate (plan-gate.ts + GATED_FEATURES), the disposable-email signup block, the free-tier SendGrid subuser, and the Postmark bounce webhook. USE WHEN a send is blocked/paused/suspended, a tenant hit 'requires the Grassroots plan', changing plan feature gates or send caps/tripwire thresholds, adding a plan-gated module, un-pausing a tenant, or touching newsletter_send_log / tenants.sending_paused_at / phone verification. EXAMPLES: 'why can't this free tenant send', 'resume sending for tenant X', 'gate the new module to Movement', 'change the warm-up cap'."
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
     whitelabel flow writes that).
   - Free plan and `tenants.sending_phone_verified_at` null → PRECONDITION_FAILED. Phone
     verification lives in `settings/controller.ts` (`requestPhoneVerification` /
     `confirmPhoneVerification`, Twilio SMS via `lib/sms`, code hash stored on the tenant row —
     deliberately NOT in settings, whose snapshot is client-readable). UI: Workspace →
     Communications → "Sending phone verification".
   - Free plan and tenant younger than 7 days → warm-up cap: ≤100 emails per rolling 24h
     (`warmupDailyCap`, summed from `newsletter_send_log`).
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
FEATURE_MATRIX (keep both in sync): forms/donations/automations/lists/volunteers →
`grassroots`+; canvassing/deliveries → `movement`+. `planFeatureGate(feature)` is a tRPC
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
auto-pass DNS verification when no valid SendGrid key is configured (set in `.env.test` for the
backend suite). Without it, domain verification fails closed: a missing/broken SendGrid key or a
SendGrid API outage leaves records unverified rather than silently opening the sending guards
(`settings/controller.ts` `verifyVerifiedDomain`, `sendgrid-whitelabel.service.ts` validate
fallbacks). Note domain `status: 'verified'` requires SPF + both DKIM records + link branding;
DMARC is recommended but optional and never blocks verification.
