---
name: pplcrm-website-claims
description: "The registry of factual claims the marketing website makes (prices, plan caps, sending thresholds, retention windows, security mechanisms, subprocessors, residency, cookies) and the code that backs each one. The site's credibility strategy is 'specific, checkable claims', which means ANY code change that alters one of these facts must update the website copy in the same change. USE WHEN changing plan pricing/caps/feature gates, send-guard thresholds or warm-up caps, retention/backup windows, auth/session/cookie mechanics, adding or removing a third-party service (analytics, error tracking, payment, email, SMS), changing data residency or deletion behavior, or editing any page under apps/website. EXAMPLES: 'raise the bounce tripwire to 6%', 'add Sentry to the backend', 'change backup retention', 'move canvassing to Grassroots', 'add a cookie'."
---

# Website claims — keep the site true

The marketing site deliberately makes **specific, checkable claims** (exact thresholds, exact
retention windows, named algorithms, a closed cookie list). That is the trust strategy: the
privacy policy and security page read like engineering docs, not lawyer fog. The cost of that
strategy is a standing obligation: **when a change alters a fact the site states, update the
site in the same change.** A stale specific claim is worse than a vague one; it is a broken
promise in writing.

## The rule

Before shipping a backend/infra/plans change, ask: "does any page on pplcrm.com state the
number, mechanism, vendor or behavior I just changed?" If yes, update the page(s) and, for the
legal documents, bump the `updated:` date in the same commit. Sweep with:

```bash
grep -rn "<the number or term>" apps/website/src libs/common/src/lib/billing/plans.ts
```

## Claims registry: source of truth → where the site states it

**Auto-derived (change plans.ts and these update themselves):**

- Plan prices, brackets, subscriber/email/seat/storage/volunteer caps, feature matrix,
  residency regions — source `libs/common/src/lib/billing/plans.ts` (`PLANS`,
  `FEATURE_MATRIX`, `GATED_FEATURES`, `DATA_RESIDENCY_REGIONS`) → pricing page and home
  teaser render it live. But `PlanDef.features[]` vs `FEATURE_MATRIX` are two hand-synced
  lists (see the comment on `FEATURE_MATRIX`), and the surfaces below hardcode prose.

**Hand-written prose that quotes facts (the drift risk):**

| Fact                                                                                                                                      | Source of truth                                                                                                                        | Site copy that states it                                                                                                                                                                                                              |
| ----------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Plan prices/caps in prose                                                                                                                 | `plans.ts` ladders                                                                                                                     | `faq-page.ts` (Pricing group), `eula-content.ts` §3 (behavioral: brackets, USD, notice)                                                                                                                                               |
| Bounce 5% pause / complaint 1% suspend / warm-up caps / verified-domain requirement                                                       | `apps/backend/src/app/modules/newsletters/send-guards.ts`                                                                              | `eula-content.ts` §8, `security-content.ts` (Sending protections), `faq-page.ts` (Newsletters)                                                                                                                                        |
| Preflight deliverability check: "below 50 cannot send" band, AI review by Anthropic, what the AI receives (draft subject/body/links only) | `libs/common/src/lib/schemas/content-check.schema.ts` (`PREFLIGHT_BLOCK`/`PREFLIGHT_GOOD`), `modules/newsletters/preflight.service.ts` | `security-content.ts` (Sending protections), `eula-content.ts` §8 (deliverability-check bullet), `privacy-content.ts` (subprocessors + third residency exception), help articles `newsletters`/`sending-protections`/`deliverability` |
| Forced newsletter footer (org name, postal address, unsubscribe)                                                                          | `lib/jobs/handlers/newsletter.handlers.ts` (`buildNewsletterFooter`)                                                                   | `eula-content.ts` §8, `privacy-content.ts` (customers' lists section)                                                                                                                                                                 |
| Donations are Stripe Connect only + 1% platform fee                                                                                       | donations module; `DONATIONS_PLATFORM_FEE_PERCENT` in env                                                                              | `eula-content.ts` §9, `privacy-content.ts` (subprocessors), `security-content.ts` (Payments), `pricing-page.html` (notes), `faq-page.ts` (Pricing)                                                                                    |
| Tenant deletion: 30-day grace, then hard delete across all tables                                                                         | `modules/settings/controller.ts` + `lib/jobs/handlers/deletions.handlers.ts`                                                           | `privacy-content.ts` (Retention), `eula-content.ts` §5, `data-ownership-page.html`, footer tagline, FAQ                                                                                                                               |
| Backup retention 7 days                                                                                                                   | `infra/azure/main.bicep` (`backupRetentionDays`)                                                                                       | `privacy-content.ts` (Retention), `security-content.ts` (Infrastructure), `data-ownership-page.ts` ("within days")                                                                                                                    |
| Activity log 90 days; exports 30 days; import files 90 days                                                                               | exports/activity modules + docs                                                                                                        | `privacy-content.ts` (Retention), `security-content.ts` (Audit trails)                                                                                                                                                                |
| Sessions 24h / 30d remember-me; companion sessions and links 30 days; 2FA/code TTLs                                                       | `modules/auth/*`, `modules/companion-access/controller.ts`                                                                             | `privacy-content.ts` (Retention), `security-content.ts` (Account security, Field access)                                                                                                                                              |
| argon2id, passkeys, hashed tokens, AES-256-GCM OAuth secrets, signature-verified webhooks                                                 | `lib/password-hash.ts`, `lib/token-hash.ts`, `lib/secret-crypto.ts`, webhook routes                                                    | `security-content.ts` (Account security, Encryption, Integrations)                                                                                                                                                                    |
| Cookie list is exactly `pc_refresh` + `pc_signed_in`                                                                                      | `modules/auth/auth-cookie.ts`                                                                                                          | `privacy-content.ts` (Cookies). Adding ANY cookie breaks this claim                                                                                                                                                                   |
| "No third-party analytics, no ad trackers, no error-tracking scripts"                                                                     | absence of such deps in `package.json` / `index.html`                                                                                  | `privacy-content.ts` (What we never do, Cookies). Adding Sentry/GA/Plausible/PostHog ANYWHERE user-facing breaks this claim; update privacy + subprocessors first                                                                     |
| Subprocessor list (Azure, Cloudflare, Stripe, Postmark, SendGrid, Twilio, Anthropic, Google Maps, Google/Microsoft sync, Zapier)          | integration modules + `.env.production.example`                                                                                        | `privacy-content.ts` (Service providers). Adding/removing a vendor = edit this list, same commit                                                                                                                                      |
| Residency: Canada default; Movement chooses US/EU/Canada/UK; Stripe stores payment data in the US                                         | `DATA_RESIDENCY_REGIONS` + `infra/azure` + `docs/donations.md`                                                                         | footer bottom line, FAQ (Your data), `privacy-content.ts` (Where your data lives), `security-content.ts`, `about-page.html`                                                                                                           |
| Volunteers see only their turf/route; code + admin approval; hashed device sessions                                                       | `modules/companion-access`                                                                                                             | FAQ (Field apps), `security-content.ts` (Field access), `eula-content.ts` §10, `data-ownership-page.html`                                                                                                                             |
| CSV export of everything, every plan; reads stay open on downgrade                                                                        | `modules/exports/controller.ts`, `plan-gate.ts`                                                                                        | FAQ, footer, `data-ownership-page.ts`, `eula-content.ts` §3/§5, About page                                                                                                                                                            |
| "Delete means deleted"                                                                                                                    | deletions handlers (above)                                                                                                             | footer tagline, FAQ, data-ownership, privacy                                                                                                                                                                                          |

## Where the copy lives

- Legal/trust documents are typed data: `apps/website/src/app/legal/{privacy,eula,security}-content.ts`
  (shared shell `legal-page.ts`). Each has an `updated:` field — bump it when the document's
  substance changes.
- Trust/marketing prose: `apps/website/src/app/company/{about,careers,data-ownership}-page.{ts,html}`,
  `faq-page.ts`, `home-page.ts`, `site-footer.ts` (the tagline + bottom bar), `compare-page`.
- Public docs mirrors: `apps/website/src/generated/docs/*` are generated from help articles —
  fix the source article in `libs/common/src/lib/help/articles/`, not the generated file.
- New marketing routes must also be added to `MARKETING_PATHS` in
  `apps/website/tools/generate-help-static.ts` (sitemap + llms.txt) and, if replacing a stub,
  swap the `/soon` link in `site-footer.ts`.

## Known intentional gaps (do not "fix" into stronger claims)

- The site does NOT claim SOC 2 / ISO certification; the security page explicitly disclaims
  badges. Keep it that way until an audit actually happens.
- The site does NOT claim an RFC 8058 one-click List-Unsubscribe header (SendGrid may add one;
  our code does not set it). The claim is "a working unsubscribe link".
- Multi-region residency is a Movement-plan promise; only Canada Central is stood up today
  (other regions are a Bicep param change). Copy says "the region you choose on Movement" —
  do not sharpen it to "live in four regions today".
- Governing law is written as Ontario, Canada and the legal entity is just "pplCRM" — no
  registered entity name exists in the repo. If the business incorporates or picks a different
  jurisdiction, update `eula-content.ts` §17 and the privacy overview.
