# PeopleCRM Skill Library — Build Brief

Directions for the agents that will author and review the project skill library.
**Do not skip the grounding step for any skill** — every fact, file path, and command in a
SKILL.md must be verified against the live repo, not recalled or guessed. Token cost is not a
constraint here; a wrong or stale skill is worse than no skill, because a cheaper model will
trust it blindly.

## Format spec (mirror this exactly)

Location: `.claude/skills/<slug>/SKILL.md` (project-scoped, checked into git, alongside a
`references/` subfolder if a skill needs longer worked examples pulled out of the main body).

Frontmatter has exactly two fields — don't invent extra ones:

```markdown
---
name: <slug>
description: "<what it does, one sentence>. USE WHEN <concrete trigger scenarios>. EXAMPLES: '<verbatim example prompt>', '<another>', '<another>'."
---
```

Model the description on the `nx-workspace` skill at
`/Users/zee/.claude/plugins/marketplaces/nx-claude-plugins/skills/nx-workspace/SKILL.md` — it's
the reference example already in this environment. The description is the _only_ thing used to
decide whether the skill fires, so it must contain the actual trigger words a user or a
lint/test failure message would contain, not just a topic label.

Body rules:

- Lead with the non-obvious rule or gotcha, not a restatement of what CLAUDE.md already says.
- Every file path, function name, and shell command must be copy-pasted from an actual grep/read/run
  against this repo — cite `file:line`.
- Include at least one worked example lifted from real code in this repo (not invented), with a
  file:line reference so a reader can go look at the real thing.
- State non-goals: what this skill deliberately does NOT cover, and which other skill (project or
  global) owns that instead.
- Keep it tight. If the honest content is 40 lines, don't pad to 150.

## Don't duplicate what already exists

These are already available and should be referenced, not reimplemented:

- Global/plugin skills: `nx-workspace`, `nx-generate`, `nx-run-tasks`, `nx-plugins` (Nx mechanics)
- Slash-command skills in this environment: `/code-review`, `/verify`, `/run`, `/security-review`,
  `/simplify` (generic review/run/verify workflows — project skills should say "then run
  `/verify`", not re-explain what verify does)

Project skills below should focus on knowledge that is **specific to this repo** and not
derivable by a generic tool: naming conventions, the multi-tenant safety net, the internal
`form()` helper, the pre-commit-vs-nx-lint gap, etc.

## Repo facts already confirmed (reuse these, don't re-derive)

- 24 frontend "experiences" under `apps/frontend/src/app/experiences/*`, ~28 backend "modules"
  under `apps/backend/src/app/modules/*`, mostly 1:1 by name (e.g. `teams`, `tasks`, `households`).
  `teams` and `tags` are good small/canonical reference modules — small enough to read in full.
- Both backend and frontend `test` targets run **Vitest** (`apps/backend/project.json` and
  `apps/frontend/project.json` both invoke `vitest run`). There is also a root `jest.config.ts` /
  `jest.preset.cjs` — the authoring agent for `pplcrm-testing` must check whether anything still
  wires to Jest before writing about it; don't assume it's dead without checking `nx.json` /
  `project.json` targets and `grep -rl "jest" apps/*/project.json libs/*/project.json`.
- Custom ESLint rule enforcing multi-tenant scoping:
  `tools/eslint-rules/rules/no-unscoped-db-query.cjs`. Default `ignoreTables`:
  `['authusers', 'sessions', 'tenants', 'tags']`. This is a security-critical convention that is
  currently **not documented anywhere in CLAUDE.md except a one-line pointer added today** — the
  `pplcrm-tenant-safety` skill is the authoritative deep-dive.
- Lint-staged config (what actually gates commits) lives in the root `package.json`, not a
  separate `.lintstagedrc`.
- Current branch (`fix/lint-warnings`) has uncommitted work on the "orientation layer" of the UX
  redesign: `detail-header.ts`, `detail-layout.ts`, `breadcrumbs.ts`, `datagrid.ts`, and a new
  untracked `apps/frontend/src/app/services/record-navigation.service.ts` (134 lines, prev/next
  record navigation). These are the freshest, most-intentional examples of the current page-layout
  pattern — use them as the primary source for `pplcrm-page-layout-ux`, not older experience files
  that predate the refactor.
- The user (Zee) keeps a private memory store outside the repo at
  `/Users/zee/.claude/projects/-Users-zee-Coding-pplcrm/memory/`, with `feedback-design-principles.md`
  and `project-design-track.md` holding UX judgment calls that aren't written down anywhere in the
  repo (three-orientation-questions rule, disclosure-over-suppression, semantic-tokens-only, no
  hover-only affordances). The `pplcrm-page-layout-ux` author should read those two files and fold
  the durable rules into the skill so they survive without depending on that private memory store.

## The 10 skills to build

Each entry: slug — trigger — grounding (read these before writing anything) — must cover —
non-goals.

1. **`pplcrm-add-entity`** — "add a new CRUD entity/module/experience", "scaffold a new record
   type". Ground in `apps/backend/src/app/modules/tags/**`, `apps/frontend/src/app/experiences/tags/**`
   or `teams`, `libs/common/src/lib/schemas/tags.schema.ts`, `apps/backend/src/app/routes.ts`,
   frontend routing (`app.routes.ts` / experience-level routes). Must cover: the full chain —
   Zod schema triad → migration → Kysely types → tRPC router/procedures → registration in
   `routes.ts` → frontend experience (list + detail views) → breadcrumbs → activity log
   requirement → where tests go. Non-goal: don't re-explain tRPC/Kysely mechanics in depth,
   link to `pplcrm-trpc-backend`.

2. **`pplcrm-trpc-backend`** — "add a tRPC procedure", "backend endpoint", "TRPCError", "Kysely
   transaction". Ground in an existing module's router + `apps/backend/src/app/errors`,
   `apps/backend/src/app/logger.ts`, any module doing a multi-table transactional write, and one
   background-jobs / transactional-outbox example if one exists (grep `background_jobs`). Must
   cover: TRPCError usage and error codes actually used in this repo, the
   correlationId+Pino sanitization pattern with a real example, Insertable/Updateable usage,
   transaction wrapping, transactional outbox pattern with a real call site.

3. **`pplcrm-tenant-safety`** — "cross-tenant", "no-unscoped-db-query", "tenant_id", "data leak
   between tenants". Ground in `tools/eslint-rules/rules/no-unscoped-db-query.cjs` in full (read
   the whole file, including how it walks the AST and what it does/doesn't catch — e.g. it only
   checks a single contiguous chain, not queries broken into intermediate variables) and its
   eslint.config wiring (grep for `no-unscoped-db-query` across `eslint.config.cjs` files). Must
   cover: what triggers it, the ignore-list and why each table is on it, what the rule can't catch
   (broken-up chains) and what to do about that manually, how to add a new ignored table safely
   (and why that's a security review decision, not a lint-silencing one).

4. **`pplcrm-migrations`** — "add a migration", "schema change", "schema_dump.sql". Ground in
   `apps/backend/src/app/_migrations/` (list files, read the newest one and `0001_baseline.ts`),
   `apps/backend/src/app/kyselyinit.ts`, and `tools/ai-migrations/` if it's an active tool (check
   whether it's used or vendored/generated cruft before recommending it). Must cover: the
   timestamped-file naming convention actually in use (read real filenames, don't guess the
   format), the "never edit an applied migration" rule with what breaks if you do, how/when to
   regenerate `schema_dump.sql` via `pg_dump --schema-only`.

5. **`pplcrm-angular-components`** — "signals", "the form() helper", "loading gate", "pc-icon",
   "input.required". Ground in `libs/uxcommon/src/loading-gate.ts`, the `form()` helper
   implementation (grep for its definition, likely under `libs/uxcommon` or `apps/frontend/.../shared`),
   `libs/uxcommon/src/components/icons/icons.index.ts` (for `PcIconNameType`), and a real edit
   component such as `apps/frontend/src/app/experiences/users/ui/user-edit.ts`/`.html`. Must
   cover: `form(payload, ...)` + `[formField]` + `.invalid()` with a real before/after snippet,
   `createLoadingGate()` begin/end pattern with a real call site, icon size-integer constraint
   with the actual valid `PcIconNameType` values (or where to find the full list — don't enumerate
   a stale subset).

6. **`pplcrm-page-layout-ux`** — "detail page", "breadcrumbs", "record navigation", "prev/next
   record", "activity log", "detail-layout", "grid header". Ground in the currently-modified files
   listed above under "Repo facts" (they represent the newest intentional pattern, not stale
   pre-refactor code), plus the two private memory files named above. Must cover: composition of
   `pc-detail-layout` / `pc-detail-header` / `pc-breadcrumbs` / the new
   `record-navigation.service.ts`, the mandatory `<pc-record-activities>` placement, when to use
   `AlertService` vs the confirm-dialog service vs neither, and Zee's three-orientation-questions /
   disclosure-over-suppression rules distilled into a short checklist. This is a review checklist
   as much as a how-to — call that out in the description.

7. **`pplcrm-quality-gate`** — "before committing", "pre-commit failing", "lint passed but hook
   rejected it", "no-floating-promises", "no-misused-promises". Ground in the (now-tightened)
   CLAUDE.md section 6, the root `package.json` lint-staged config, and `eslint.config.cjs`. Must
   cover: the exact command sequence, the nx-lint-vs-pre-commit-hook gap with a concrete repro if
   possible (find a file that passes `nx lint` but fails plain `eslint`, or construct a minimal
   one), and worked before/after fixes for each of the three rules named in CLAUDE.md, pulled from
   real commits if a matching one exists (`git log --oneline | grep -i "lint\|promise\|any"` —
   several such commits already exist on this branch's history, e.g. "Fixing local/
   no-unscoped-db-query warnings", "eliminate catch(err: any) and any timer handles").

8. **`pplcrm-debugging`** — "debug", "trace a bug", "correlationId", "why did this fail in
   production", "tRPC error in the client". Ground in the error-sanitization plumbing under
   `apps/backend/src/app/errors` and `logger.ts`, Fastify plugins under
   `apps/backend/src/app/plugins`, and how a correlationId shows up in a client-visible error
   (grep the frontend for where TRPCError responses are surfaced, e.g. `AlertService` call sites).
   Must cover: the actual request → log → client round trip for a real error path, how to grep
   Pino output for a correlationId, common silent-failure traps specific to this codebase (a
   floating promise swallowing an error, a loading gate never `end()`-ed leaving a stuck spinner).
   Non-goal: general Angular/Node debugging — only what's specific to this stack's wiring.

9. **`pplcrm-schemas-validation`** — "Zod schema", "AddXObj", "UpdateXObj", "core.schema". Ground
   in `libs/common/src/lib/schemas/core.schema.ts` in full (the shared helpers:
   `nameSchema`/`idSchema`/`descriptionSchema`/`phoneSchema`/etc.) and one full schema file (e.g.
   `teams.schema.ts` or `tasks.schema.ts`) plus the corresponding frontend `form()` usage. Must
   cover: the `AddXObj` / `UpdateXObj` / `XObj` triad convention and why three shapes instead of
   one, when to use `.partial()` vs hand-writing the Update variant (both patterns exist in this
   repo — show both with real examples and the tradeoff), how these connect to tRPC input
   validation and to the frontend form.

10. **`pplcrm-testing`** — "write a test", "vitest", "spec file not caught by lint". Ground in the
    actual test runner confirmed above, an existing `.spec.ts` in both `apps/backend` and
    `apps/frontend`, and `vitest.config.ts`. Must cover: which runner is actually live (verify,
    don't assume), where spec files live relative to source, and the specific interaction with
    `pplcrm-quality-gate` — `nx lint` skips `*.spec.ts` but the pre-commit `eslint` does not, so a
    spec file can look clean under `nx lint` and still fail the hook.

## Orchestration workflow

### Phase 1 — Authoring (parallel, one agent per skill)

Spawn 10 `general-purpose` agents in parallel, `run_in_background: true`, no worktree needed
(read + write only). Each agent's prompt must include: the slug, the trigger phrase, the specific
grounding files/greps listed above, the "must cover" list, the non-goals, and the format spec
section of this document (paste it in — the agent won't have this file's context otherwise).
Explicitly instruct each one: "Do not write a single file path, function name, or command you
haven't verified with Read/Grep/Bash in this session. If you can't verify a claim, cut it rather
than guess."

### Phase 2 — Independent review (parallel, one agent per skill, different from the author)

For each of the 10 SKILL.md files, spawn a **fresh** agent with no memory of the authoring pass.
Prompt: "Read `.claude/skills/<slug>/SKILL.md`. Verify every file path exists
(`Read`/`ls`), every function/type name is real (`grep`), every shell command actually runs in
this repo, and every code sample matches real code nearby (not paraphrased into something that no
longer compiles). Check the frontmatter is valid YAML with exactly `name`/`description` and that
the description contains concrete trigger phrases. Check for overlap: does this skill duplicate
content that belongs in `pplcrm-<other-slug>` or in an existing global/slash-command skill listed
in this brief? Report every finding as CONFIRMED (verified wrong/stale/fabricated) or PLAUSIBLE
(looks off, couldn't fully verify), each with the exact line and what's wrong." Use
`ReportFindings` if available in that agent's toolset, otherwise a plain findings list.

### Phase 3 — Fix loop

Route each skill's findings back to a fix agent (can resume the Phase 1 author via `SendMessage`
using its agent id, or spawn a new one with the SKILL.md + findings as input). Repeat Phase 2 on
anything that had CONFIRMED findings until a review pass comes back clean. Don't rubber-stamp —
a skill that "looks reasonable" is not the bar; a skill that survived someone actively trying to
break it is.

### Phase 4 — Integration smoke test

Pick the three highest-blast-radius skills — `pplcrm-add-entity`, `pplcrm-quality-gate`,
`pplcrm-tenant-safety` — and have one agent actually **use** each as written, in an isolated
worktree (`isolation: "worktree"`), to confirm it works as documented rather than just reads
plausibly:

- `pplcrm-add-entity`: scaffold one throwaway trivial entity end-to-end following only the skill's
  instructions, confirm it builds/lints/type-checks, then discard the worktree (don't merge).
- `pplcrm-quality-gate`: pick a file with a known violation type (or introduce one on a scratch
  branch) and confirm the documented command sequence actually catches what the skill says it
  catches.
- `pplcrm-tenant-safety`: write a one-line Kysely query that should trip the rule and one that
  shouldn't, run eslint, confirm the skill's description of what fires/doesn't matches reality.

## Definition of done (per skill)

- Frontmatter valid, two fields only, description has real trigger phrases a future prompt would
  actually contain.
- Zero fabricated file paths, function names, or commands — everything in the skill was verified
  in this session, not recalled.
- At least one real, working code example with a file:line citation.
- Explicit non-goals section pointing to the skill/command that owns the adjacent concern.
- Survived an adversarial review pass from an agent that didn't write it.
- The three Phase-4 skills additionally passed a live dry run.
