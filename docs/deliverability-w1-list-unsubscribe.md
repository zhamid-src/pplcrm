# W1 — Verify (then, if needed, implement) RFC 8058 one-click unsubscribe

Status: **pending a live verification send** — this is the one step of the 2026-07-17
deliverability work that needs real SendGrid credentials and a real mailbox.

## Why this matters

Gmail and Yahoo (since Feb 2024) and Microsoft (since May 2025) require bulk senders to include
`List-Unsubscribe` (mailto and/or https) **and** `List-Unsubscribe-Post: List-Unsubscribe=One-Click`
headers. pplCRM's send body sets neither (`apps/backend/src/app/lib/mail/newsletter-mail.service.ts`
— only `tracking_settings.subscription_tracking` is enabled). SendGrid added RFC 8058 support in
2024 and _may_ inject the headers itself when subscription tracking is on — which is why we verify
before writing code: a duplicate custom header could conflict with theirs.

## Verification procedure (~10 minutes)

1. In a workspace with a **verified domain**, send a real newsletter (not a test send — test sends
   skip nothing relevant, but broadcast is the path that matters) to a Gmail address you control.
   Do this twice: once from a tenant on the **platform key + free-tier subuser** path, once from a
   tenant with its own **whitelabel subuser** (both paths route through `on-behalf-of`).
2. In Gmail, open the message → ⋮ → **Show original**. Check for:
   - `List-Unsubscribe:` — should carry a `<mailto:…>` and/or `<https://…>` value.
   - `List-Unsubscribe-Post: List-Unsubscribe=One-Click`
3. Record the result per path in this file.

## Decision

- **Both headers present on both paths** → done. Update this file to "verified — SendGrid injects
  RFC 8058 headers"; optionally note it in the `pplcrm-sending-guards` skill. Do not add custom
  headers.
- **Absent or partial** → implement:
  1. The send already builds **one personalization per recipient**
     (`newsletter-mail.service.ts:66-71`), so the per-recipient `List-Unsubscribe` URL goes in
     `personalizations[].headers` (per-personalization headers override message-level ones;
     **substitutions cannot set headers**). The recipient-invariant
     `List-Unsubscribe-Post: List-Unsubscribe=One-Click` goes in the message-level `headers`
     object of the body.
  2. One-click target: a public POST route beside the SendGrid webhook in
     `apps/backend/src/app/modules/newsletters/routes/` taking a signed token
     (HMAC over `tenant_id:campaign_id:email`, keyed on a server secret — see `lib/token-hash.ts`
     for the house token idiom). The handler marks the campaign subscription unsubscribed —
     the same effect as the webhook's `unsubscribe` branch
     (`newsletters-webhook.route.ts:26-39`). RFC 8058 requires it to accept the POST with no UI
     and no authentication beyond the token.
  3. Note: the marketing site deliberately does **not** claim one-click today (see
     `pplcrm-website-claims` → known intentional gaps). If we implement it ourselves, that gap can
     be upgraded to a real claim — same change.

## Results

| Send path                                   | List-Unsubscribe | List-Unsubscribe-Post | Checked on |
| ------------------------------------------- | ---------------- | --------------------- | ---------- |
| Platform key + `SENDGRID_FREE_TIER_SUBUSER` | ☐                | ☐                     | —          |
| Tenant whitelabel subuser                   | ☐                | ☐                     | —          |
