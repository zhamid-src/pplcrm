---
name: verify
description: 'How to drive the running PeopleCRM app end-to-end for verification — launch/attach to the dev servers, sign in with a throwaway tenant via Playwright, seed data through the UI or dev DB, and the traps (two-step signin, email verification, Vite error overlay). USE WHEN verifying a frontend/backend change against the real running app, writing a Playwright drive, or needing an authenticated session on localhost.'
---

# Verifying PeopleCRM against the running app

## Servers

Dev servers are usually already running: frontend `http://localhost:4200`, backend `:3000`.
Check with `lsof -nP -iTCP:4200 -iTCP:3000 -sTCP:LISTEN`. If not, `npm exec nx serve backend`
and `npm exec nx serve frontend`. HMR picks up edits — no restart needed after template changes.

## Playwright

No global install; import straight from the repo:

```js
import { chromium } from '/Users/dev/Coding/pplcrm/node_modules/@playwright/test/index.mjs';
```

**Trap — Vite error overlay:** any TS error anywhere in the watched workspace (including
another session's half-done backend edit) renders a `vite-error-overlay` that swallows
clicks. Strip it continuously:

```js
await page.addInitScript(() => {
  setInterval(() => document.querySelectorAll('vite-error-overlay').forEach((e) => e.remove()), 200);
});
```

## Auth: throwaway tenant

1. **Sign up** at `/signup`: placeholders "Your first name", "Organization name (or self)",
   "Enter your email", one password field; the submit button is **"JOIN"** (not "Sign up").
2. Signup lands on `/signin?verificationPending=true` — email verification blocks sign-in.
   Flip it in the dev DB (table is `authusers`, not `users`):
   ```bash
   psql -h localhost -U pplcrm_owner -d pplcrm \
     -c "UPDATE authusers SET verified = true WHERE email = '<the throwaway email>';"
   ```
   DB settings live in repo-root `.env.development` (`DB_NAME=pplcrm`, local trust auth).
3. **Sign-in is two-step**: fill email → click **Continue** → password field appears →
   click **Sign in**.

Clean up: `DELETE FROM tenants WHERE id=<n>` does **not** cascade everywhere
(`campaign_person_facts` FK blocks it). Leave the throwaway tenant and say so in the
report rather than hand-deleting child tables.

## Seeding data

Prefer the UI (New person at `/people/add`, New task on `/tasks`). For records with no
quick create path (e.g. a **sent** newsletter for the report page), insert directly —
`newsletters` needs `tenant_id`, `campaign_id` (the tenant's office campaign),
`createdby_id`/`updatedby_id`, `name`; status default is 'sent'.

## Flows worth driving

- Detail pages: navbar crumb trail (first crumb = back), record pager "N of M" only after
  opening from a **datagrid** (tasks list is bespoke — no handoff, pager hidden by design).
- Not-found states: `/tasks/999999999`, `/newsletters/999999` — layout renders the alert;
  header action buttons must be gated on the record existing.
- Screenshots at 1440×900 into the session scratchpad.
