# PeopleCRM — Gap Direction (repo `main` → North Star prototype)

**For:** Opus 4.8 implementing in `zhamid-src/pplcrm`.
**Source of truth:** `PeopleCRM North Star.dc.html` (this design project) — when this doc and the prototype disagree, the prototype wins. Companion specs: `handoff/IMPLEMENTATION.md` (full behavior spec, copy strings verbatim) and `handoff/UX-GUIDELINES.md` (rules). This doc is only the **delta**: what the repo at commit `6459ae1` still gets wrong, audited file by file. Don't touch what isn't listed.

Work top to bottom — Phase 0 changes the look of every page and must land first.

---

## Phase 0 — Tokens & type (`apps/frontend/src/styles.css`, `src/index.html`)

1. **Font.** Body is `'Roboto', sans-serif; font-weight:300`. Change to `'Inter', system-ui, sans-serif; font-weight:400` and load Inter 400/500/600/700 in `index.html`. Sweep `font-light`/300 on body copy up to 400 (headings keep 600–700). The `.tooltip::before { font-weight:300 !important }` override becomes 400.
2. **Add the `--color-line` token** to both theme blocks (light `#e7e5e4`, dark `#1a2b45`) and use it for hairline borders app-wide. Today borders are a mix of `base-300`, `base-200`, `border-double border-b-4` (inbox), `border-r-2` (sidebar) — all become `1px solid var(--color-line)`.
3. **Complete the theme blocks** to match the prototype 1:1. Light is missing `--color-base-content:#1f2937`, `--color-primary-content:#ffffff`, `--color-success-content:#053a34`, `--color-warning-content:#4a3d0a`; error-content is `#ffffff` (repo has `#f0f0f0`). Dark: `--color-accent-content:#0b1220`, add the three feedback-content colors (`#052e12`, `#3d2a05`, `#2b0505`).
4. **Add the `savedFlash` keyframe** (color-mix success → transparent, see prototype helmet) for grid/form save flashes.
5. **Kill hardcoded hues** (§ zero-hardcoded-hues rule). Grep and fix: `#3b82f6` + `#10b981` in `summary.html` SVGs (→ `var(--color-primary)` / `var(--color-success)`), `text-indigo-500 / emerald / amber / purple / pink / violet` in `person-view.html`, `text-amber-500` in `email-header.html`, gray hexes in `.email-scrollbar`. Every changed surface must pass a dark-theme toggle.

## Phase 1 — App shell

### `layout/navbar/navbar.html` + `.ts`

- **Icon order:** search → fullscreen → **bookmark (new)** → theme → notifications → avatar. The bookmark/pin control moves here from the breadcrumb: it pins the CURRENT page into the sidebar PINS section (reuse the existing `hiddenByFavourite` model in `sidebar-service.ts`). On non-pinnable record pages it dims with reason in tooltip + toast ("Only main pages can be pinned…"). Toasts narrate pin/unpin.
- Search placeholder `"Search people, emails, campaigns"`; render `⌘K` as one small bordered chip, not two `<kbd>`s; search field is the flex-shrinking element (`flex:1 1 120px; max-width:360px; min-width:0`).
- **Avatar:** replace the logo-sq image fallback with an initials circle — 34px, 2px `border-primary`, `bg-primary/10 text-primary`, weight 600.
- Notification dot: static 8px primary dot with a 2px `base-100` ring, top-right of the bell. Drop `animate-ping`/`animate-pulse`.
- Avatar menu: divider before Sign out; **Settings opens the personal-settings popup** (Phase 5), not `/settings`.

### `layout/breadcrumb/breadcrumb.ts`

- Remove the `home` crumb (the logo is home) and the bookmark icon (moved to navbar).
- Crumbs are **real names**, not raw URL segments: "People / Amira Hassan / Edit". Last crumb weight 500 (current-page color), earlier crumbs muted + clickable. Record routes use slugs, never internal IDs.

### `layout/sidebar/sidebar.html` + `sidebar-items.ts`

- Section headings: uppercase, 10.5–11px, weight 500, `letter-spacing:.09em`, `text-base-content/45`. Items: 13px, `letter-spacing:.03em` (delete `tracking-widest`), weight 400 at rest; **active = weight 600 + `text-primary`** (stays lit when a child route is open); hover changes **color only** — remove `hover:font-bold` (it shifts layout).
- Inbox gets the count badge: pill, 10.5px/600, `bg-primary/14 text-primary`, `tabular-nums`.
- Collapsed-rail logo: the `pC` monogram tile (32px, rounded 9px, `bg-primary/12 text-primary`), not `logo-sq.svg`.
- Rename SYSTEM item **Configuration → "Workspace"** (route can stay; label + page title change, see Phase 5).

## Phase 2 — Dashboard (`experiences/summary/summary.html` + `.ts`)

The repo page is a different design (icon-in-title "CRM Summary Dashboard", full-bleed colored SLA cards, donut chart, insights card, bottom bar chart, zebra table, Title Case, italics, pulsing badges). **Rebuild to the prototype layout** (screens `01`/`10`, pins 1–5):

1. Header: date line (12px muted) + greeting `h1` (24px/700) + **briefing paragraph** — one 14px sentence-flow where the numbers are inline primary links ("6 unassigned conversations", "3 tasks", "212 new contacts", newsletter draft) routing to Inbox / SLA details / People / Newsletters. Right: quiet bordered "Reload stats" button (spins behind the loading gate).
2. Getting-started card (dismissible, shown until done): check rows + primary "Send your first newsletter" link row.
3. Row of **3 next-action cards** (warning-tinted "6 unassigned conversations · Assign owners", error-tinted SLA, neutral draft) — kicker 10.5px, big number 26px/700, underlined CTA.
4. Row of **5 quiet stat cards**: white card, title 10.5px uppercase muted, primary 17px icon right, value 23px/700 `tabular-nums`, desc 11px. No per-card rainbow colors. Skeleton flash while loading.
5. Growth chart (2fr, primary line + 14% area fill, dashed gridlines) beside **"Coming up"** list card (1fr, icon tiles `bg-primary/10`, clickable rows).
6. Representative performance table: quiet — 11.5px/500 muted headers, hairline `--color-line` row borders, **no zebra**, resolution + breaches as tinted pills (`success/14`, `error/14`…), `tabular-nums`. Columns per prototype: Representative · Open · Closed · Resolution · Avg first response · SLA breaches.
7. The donut, insights card, and bottom bar chart are **cut**. SLA drill-down survives as `pc-sla-details` opened from the briefing's "3 tasks" link. Sentence case everywhere; no italics; no `animate-pulse`.

## Phase 3 — People grid (`shared/components/datagrid/*`, `experiences/persons/*`)

Chips become the single source of truth (§2 of IMPLEMENTATION.md — full behavior + copy there). Repo deltas:

- **Page header** (persons-grid): `People` title + always-visible count sentence `"{matched} match your filters · {total} people total"` (`tabular-nums`), and a primary **"Add person"** button top-right. Remove Add from the toolbar.
- **Filter row under the header** (new): segmented **All {n} / Donors {n} / Volunteers {n}** control (replaces the toolbar "Narrow by type" dropdown), funnel glyph + removable chips, dashed **Add filter** pill, dashed **Tags** and **Issues** pills opening checkbox dropdowns with per-item counts (OR → one chip each: `"Tags: any of donor, host"`), "Clear all" link. The toolbar tag/issue/type dropdown buttons in `datagrid-toolbar.html` are removed.
- **Toolbar shrinks** to: `Refresh | Undo · Redo | Import CSV · Export CSV | Filters · Query builder | Columns`, grouped by thin dividers (`--color-line` 1px, not `ellipsis-vertical` icons). Clone/Delete/Merge leave the toolbar → bulk bar.
- **Bulk bar** (new, appears on selection): `"{n} selected"` | Add tag | Export | Merge (exactly 2) | Clone (exactly 1) | right-aligned error **Delete {n} people**. Disabled items name their unmet condition in the tooltip (copy verbatim from spec). Danger confirm styles **"Keep people"** as primary.
- **Mutual exclusion tooltips** (the enable logic already exists): filters button while query active → `"The query builder owns filtering — clear its rules to use simple filters"`; QB while chips exist → `"Simple filters are active — clear them to use the query builder"`.
- **Rows** (`datagrid.html`): delete the hover-only `arrow-top-right-on-square` open icon; checkbox column 36px. **The name cell is the door** — underlined at rest (22%-opacity underline, `text-underline-offset:3px`), hover → primary, opens the record; empty names render "Unnamed person" (muted, still clickable) via a shared `fullName()` fallback. Remove zebra striping (`bg-base-200` on odd rows) — hairline row borders only. Inline-edit commit replays the new `savedFlash` + toast "Saved — email updated for {name}".
- **Header cells:** simplify to label + sort indicator + resize handle (sort on click). The three-level per-header dropdown (Filter ▸ / Sort ▸ / Column ▸) is cut — column visibility lives in the toolbar Columns dropdown, filtering lives in the chips/panel/QB system.
- **Filter-empty state:** add the count sentence and a primary **"Clear all filters"** button (also resets view to All).
- **Pagination:** `"1–13 of 43 · Page 1 of 2"` honest copy; disabled pagers carry a reason tooltip.
- Selection banners already match the spec — keep, just re-check copy: `"All 13 rows on this page are selected."` + `"Select all 43 matching rows"`.
- **Toasts** (`AlertService`): stack max 3, coalesce identical message+type into one toast with `×N` pill, max-width 520px.

## Phase 4 — Person view & edit (`experiences/persons/ui/*`)

### person-view.html

- Title is the **record's real name** with eyebrow `PERSON` (10.5px/600/.1em/45%) and a success-tinted status chip — never `'Person Profile'` (currently hardcoded into `pc-detail-layout`). Header right: record pager `"4 of 43 filtered"` walking the grid's filtered set, divider, primary **Edit person**, **⋯ overflow** (Export vCard, Merge into another person…, ─, error **Delete person…** with "Keep person" as the primary safe default and counts in the body).
- Tabs carry counts (`Activity 8 · Donations 12 · Emails 5 · Volunteer 3 · Household 0`), pill style, active = primary tint + 600.
- Left card: keep contact rows but restyle as icon + micro-label + value with always-visible low-opacity copy buttons; **Address value links to the Household tab**. Tags = secondary tint, Issues = info tint; issues empty state is a link ("No issues yet — add what they care about" → edit), not italic gray text.
- **Cut:** the social-links button row, the Sentiment/"Affinity Analytics COMING SOON" card (its `from-indigo-500 to-purple-600` gradient violates the token rule), and the 7 rainbow stat cards (any kept stats use semantic tokens and the quiet dashboard stat style).
- Household empty tab → guided empty state: house icon, "Not part of a household yet", cause sentence, primary **Assign household** (replaces the italic one-liner).

### person-form (spec §4 — verify each against the prototype)

Dirty chip (`"Unsaved changes · {n} fields"`, warning tint), **Save never disables** (invalid email coaches inline; Save focuses first invalid field), save toast names the fields, leave guard ("Discard changes" plain / **"Keep editing"** primary), address as read-only surface with the household reason line + "Edit on household" link, tags/issues chip editors with dashed suggestion chips.

## Phase 5 — Inbox (`experiences/emails/ui/*`)

- **Folder panel** (`email-folder-list.html`): header says "Filters" — rename concept: triage views (Open/Mine/Unassigned/Closed with icons+counts) on top, collapsible **FOLDERS** section below (already split via `is_virtual` — keep). Buttons: primary-styled **New email** (drop `btn-accent`) and a quiet **Sync now** with evidence line `"Synced 2 min ago"`; sync result toast counts ("Inbox synced — 2 new emails in Open, 1 thread updated"). Panel folds to a 54px icon rail with counts in tooltips.
- **Detail header** (`email-header.html`): replace the three Reply/Reply-all/Forward circle buttons with **ONE Reply menu** (reply icon + small chevron → Reply / Reply all / Forward). **Star leaves the main cluster** — it lives only in the ⋯ menu as Star/Unstar (and loses `text-amber-500`). Keep Close-toggle and Delete; in Trash keep Restore + "Delete forever". ⋯ menu order: Create task…, ─, Star/Unstar, Mark as unread, Mark as spam, ─, Print (drop the duplicate reply items now that the Reply menu exists). All menu copy sentence case: "Create task…", "Close conversation"/"Reopen conversation" (not "Mark as Done").
- **Add the SLA pill** on every thread: `"First response due in 5h · 8h SLA"` / `"…sent in 1.2h · within SLA"` / `"Closed within SLA"`.
- **Person context rail** (new, right, 236px, base-200): PERSON CONTEXT header + collapse, avatar, name-as-door, "Donor · Ward 5", email + last-inbound card, TAGS/ISSUES chips, **Open record** button. This replaces the sender-name hover dropdown card as the primary person surface (the dropdown can go). While the rail is on, folders default to the icon rail and the list narrows to 280px.
- **Comments & Activity** become a quiet tab row below the body — `[icon] Comments {n}   [icon] Activity {n}`, active = primary + 600 + 2px underline, "Hide" link right while open; panels open below in a bordered card. Comments footer: "Comments are internal — the sender never sees them." (Check `email-comments`/`email-activities` mounting in `email-details.html` and convert from stacked sections.)
- Detail pane `min-width:340px`; all fixed panes `box-sizing:border-box`.

## Phase 6 — Settings: two tiers, two verbs (`experiences/settings/*`)

- **Naming ruling:** sidebar item **"Workspace"** → page title "Workspace settings" (WORKSPACE eyebrow). The avatar-menu item is **"Settings"** and opens a **personal popup** — retire the Configuration/Settings synonym pair.
- **Personal popup** (~430px, from avatar, INSTANT apply — no Save/Reset; footer "Changes apply instantly — nothing to save" → "Saved just now"): 1) **Notifications matrix** — one row per event with helper line and two checkbox columns under EMAIL / IN-APP headers. Today `settings.config.ts` fakes this with paired flat toggles (`task_assigned` + `task_assigned_in_app`, "(In-App)" label suffix) — restructure to the matrix and **move it out of workspace settings** into the popup. 2) **Appearance** — Theme Light/Dark + Density segments (move the `appearance` section out of workspace config). 3) **Passkeys** — fold `security/passkey-settings` in (list with error-styled Remove + consequence toast, dashed "Add passkey").
- **Workspace settings** (admin page, DELIBERATE save): left rail 224px (icon + title, active = primary tint + 600, **per-section warning dirty dots**); sections: Organization, Communications, Notifications (tenant defaults), Teams & access, **Service levels** (rename "SLA Configuration"; sentence-case its labels; the working-days field wants day toggles, not a "comma-separated 1=Mon…" text input), Donations, Integrations & API. Same dirty machinery as person edit: warning chip "Unsaved changes · N fields", **Save settings** toast names the fields, Cancel narrates, leave guard names the subject.

---

## Acceptance checklist (run after every phase)

1. Dark-theme toggle on every changed surface — zero hardcoded hues, `color-mix` over semantic vars only.
2. Every disabled control names its unmet condition (tooltip desktop / inline text touch).
3. Every count renders `tabular-nums`; copy is sentence case, verb + noun, numbers when acting on sets — strings lifted verbatim from the prototype.
4. Every destructive dialog styles the SAFE action as primary.
5. Animations only from the existing `animate-*`/flash vocabulary + `prefers-reduced-motion` guard.
6. No layout-shifting hovers (no `hover:font-bold`).
7. Prototype-only chrome is NOT implemented: the "Design notes" pill, numbered pins, and "mobile design →" buttons are annotation UI, not product.
