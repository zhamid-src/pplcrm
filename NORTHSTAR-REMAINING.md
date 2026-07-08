# North Star — Remaining Work (Waves 3 & 4)

**Self-contained handoff. You do not need prior session context.**
Branch: `chore/db-schema-remediation`. Spec: `docs/spec/PeopleCRM Full Spec.pdf` (22 sections; PDF strings are **binding copy**).

## How to work (read first, every task)

1. Read `.claude/skills/pplcrm-design-principles/SKILL.md` + `docs/spec/handoff/UX-GUIDELINES.md` before touching any UI.
2. **Audit before you build.** This doc's "current state" notes were verified on 2026-07-08 but concurrent work drifts — re-verify each claim against the working tree before writing code. Do not rebuild what already exists.
3. Check `.claude/skills/` for a matching skill (`pplcrm-add-entity`, `pplcrm-trpc-backend`, `pplcrm-tenant-safety`, `pplcrm-migrations`, `pplcrm-angular-components`, `pplcrm-datagrid`, `pplcrm-forms`, `pplcrm-quality-gate`, etc.). If your change invalidates a skill, update it in the same change.
4. Tenant-scope every new query (`.where('tenant_id', …)` — enforced by `local/no-unscoped-db-query`). New tables ⇒ new timestamped migration in `apps/backend/src/app/_migrations/YYYY-MM-DD-*.ts`; **never** regenerate `schema.sql`.
5. Keep the in-app **Help Center** in sync (`apps/frontend/src/app/experiences/help/data/articles/*.ts`) for any user-facing change.
6. Quality gate before commit (see `pplcrm-quality-gate`): `prettier --write`, `eslint` (pre-commit ruleset) **and** `nx lint <project>` (they enforce disjoint rules), `nx build frontend && nx build backend`, `nx test` on affected. Commit messages end with `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.

## Already merged (do NOT redo)

Wave 0 (IA reorg, `/workflows`→`/automations`, People/Households/Companies **grain tabs**, person opaque `public_id` URLs) · 1A geo foundation + Households §6 + Companies §7 enrich · 1B Tasks §4 rework · 1C Lists §8 smart/static · 1D Tags/Issues/Duplicates §9 · 1E CSV import wizard §17 · 2F Canvassing §13 · 2G Deliveries §14 · 2H Automations §16 editor. The loading-gate `loaded`-signal fix and datagrid toolbar/count-sentence polish are also merged.

---

## Wave 3 — completion & polish

### Track I — Newsletters §11 send pipeline (Opus; backend-heavy)
Send handler lives at `apps/backend/src/app/lib/jobs/handlers/newsletter.handlers.ts`.
**Already done (verified):** from-name/from-email from settings, real per-recipient unsubscribe via SendGrid `<% unsubscribe %>` substitution tag, scheduled reschedule via `scheduleNextRun`, engagement-event aggregation.
**Still broken / to fix — audit each:**
- The send path emits `newsletter.html_content` **verbatim** (line ~129). So: **merge fields** (`{FirstName}` etc.) are **not** substituted per-recipient; confirm where/if `html_content` is rendered from the block-JSON and whether personalization is possible at send time.
- **block-JSON in emails** — verify the stored content is real HTML, not the editor's block JSON, at send time.
- **preheader / from overrides** on the newsletter record (vs. tenant defaults) — verify they're honored.
- **Relative image URLs** — rewrite to absolute before send (relative `src` breaks in email clients).
- List page: verify 5 stat cards + contextual row actions against the spec.

### Track J — Donations §12 (Sonnet)
Donations + fundraising experiences exist. **No Record-donation dialog component was found** (`find … -ipath '*donation*' *dialog/modal*` → empty) — likely the biggest gap. Audit against Fig 15: header sentence, 4 stat cards, recent-gifts table with receipt chips, **Record-donation dialog** copy/validation.
**Decision to make here:** donation-forms convergence — spec folds donations into a Forms donation-template; app currently keeps `/d/:slug` separate. Decide with the concrete tradeoff in front of you and record the outcome in the `pplcrm-forms` skill.

### Track K — Audit pack (Sonnet; verify-and-close deltas)
- **§3 Inbox leftovers:** optimistic-apply + undo stack, list scroll restore, Trash Restore / "Delete forever", ⋯ menu contents, create-task toast repeating all three facts.
- **§15 Teams:** `teams-grid.ts` is a plain grid (0 hits for card/next-shift/No-lead). Spec wants team **cards** with next-shift + lead line + **"No lead"** warning, volunteer table w/ role chips + 30D, boundary footer, Add-volunteer dialog.
- **§18 Users:** seats sentence, inline role selects w/ self-lock, MFA column, contextual ⋯ (re-send/reactivate/deactivate), invite dialog copy.
- **§19 Activity log:** actor/kind filters, day groups, door-link sentences, kind chips, export, honest attribution ("via volunteer link").
- **§20 Profile (Fig 23):** photo upload, deliberate-save card, instant-apply notifications card, ACCOUNT facts rail.
- **§21 Settings:** instant-apply notification matrix, passkeys section, per-section dirty dots, Service-levels day toggles, consequence copy.
- **§2 Dashboard:** verify-only against Fig 2 (Reload-stats toast copy, skeletons).

---

## Wave 4 — mobile & acceptance

### Track L — Mobile §1.1 (Opus)
Not started. Scope: **People + Inbox first.** ☰ drawer, one-pane inbox stack, burger grid toolbar, bottom sheets, 44px touch targets, inline disabled reasons (no silent dead buttons).

### Track M — §22 acceptance sweep (Sonnet; run last)
10-point cross-cutting checklist on every changed surface: dark theme, `tabular-nums` on numbers, safe-primary danger dialogs, honest empty states, single-source-of-truth, activity-log coverage, motion rules, back-restores-state, Google-Maps-only. Then final Help Center integrity spec (`npx vitest run src/app/experiences/help` from `apps/frontend`) and update the `project-design-track` memory.

---

## Suggested order
J and K are independent and can start immediately (Sonnet). I is independent backend work (Opus). L depends on nothing but is large; run it while 3 lands. M runs last, after everything merges.

## Verification (per track)
`npx nx build frontend && npx nx build backend` · affected `nx test` · both lint gates · `local/no-unscoped-db-query` clean on backend · UI tracks: live in-browser check of the driven flow, dark theme included.
