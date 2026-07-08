# PeopleCRM North Star — Implementation Handoff

**For:** the implementing agent (Opus 4.x) working in the real `pplcrm` Angular codebase.
**Source of truth:** `PeopleCRM North Star.dc.html` in this project — a working prototype. Open it, toggle **Design notes** (navbar pill) and read the numbered pins on every screen: each pin cites the principle (§) from `pplcrm-design-principles` that the decision serves. When this doc and the prototype disagree, the prototype wins.
**Companion doc:** `handoff/UX-GUIDELINES.md` — the rules. Read it first; this doc is the _what_, that one is the _how_.

Do NOT reinvent: every behavior below exists in the prototype with exact copy, states, and conditions. Lift copy strings verbatim. All colors are DaisyUI semantic tokens (both themes in `apps/frontend/src/styles.css`); the prototype's `--color-*` vars map 1:1.

---

## 0. Visual reference

Screenshots of the prototype in `handoff/screens/` — use them as acceptance targets for layout, spacing and hierarchy. **Capture artifact:** icon glyphs appear as solid squares in these PNGs (the capture tool can't render CSS `mask` icons); in the real prototype/app they are the heroicon SVGs in `assets/icons/`. Trust the prototype, not the squares.

| File | Screen                                                              |
| ---- | ------------------------------------------------------------------- |
| 01   | Dashboard (light)                                                   |
| 02   | People grid — views, chips, toolbar, address column                 |
| 03   | Person view — Amira Hassan (header, tabs with counts, contact card) |
| 04   | Person edit — full form, tags/issues editors                        |
| 05   | Inbox — folders, list, detail, person context rail                  |
| 06   | Workspace settings — left rail + section body                       |
| 07   | Settings popup — notification matrix, appearance, passkeys          |
| 08   | Mobile (phone frame) — People tab                                   |
| 09   | People grid — dark theme                                            |
| 10   | Dashboard (light, notes pill visible)                               |

---

## 1. App shell & sidebar

- **App font: Inter, body 400.** In `styles.css`: swap the body `font-family` from `'Roboto'` to `'Inter', system-ui, sans-serif` and `font-weight` from 300 to 400 (load weights 400/500/600/700 from Google Fonts or self-host). Sweep remaining `font-light`/300 usages on body copy up to 400; headings keep 600–700. Tooltip weight override in `styles.css` (`font-weight: 300 !important`) becomes 400.
- **Navbar order:** search → fullscreen → bookmark → theme → notifications → avatar. The search field is the flex-shrinking element (`flex:1 1 120px; max-width:400px; min-width:0`) so the icon cluster never overflows. Fullscreen state is promise-driven (`requestFullscreen().then(...).catch(→ honest toast)`) plus a `fullscreenchange` listener so Esc keeps the icon truthful — never flip UI state before the browser confirms.
- **Bookmark → PINS (navbar, not page headers).** The bookmark icon lives in the navbar and pins the CURRENT page. Pinnable pages: Dashboard, People, Inbox, Newsletters, Workspace; on record pages the icon dims with the reason in tooltip AND toast ("Only main pages can be pinned…"). Pinning inserts a `PINS` sidebar section (below Dashboard); the item is REMOVED from its home section while pinned (your existing `hiddenByFavourite` model — no duplication) and restored on unpin. The newly pinned item enters with the house `up` 0.3s animation, once (TS marks which item, CSS animates). Toasts narrate both directions.
- **Avatar dropdown:** Profile · Settings · Sign out (divider before Sign out). Settings opens the personal-settings popup (§5a).
- **Breadcrumbs:** real hierarchy with real names ("People / Amira Hassan / Edit"), no fake "home" crumb (logo is home). Last crumb weight 500, others muted+clickable. Routes use record slugs (`/people/amira-hassan`) — never tenant IDs or internal keys in URLs (security-as-surface rule).
- **Sidebar typography (changed from current):**
  - Section headings: 10.5–11px, weight 500, `letter-spacing:.09em`, UPPERCASE, `base-content` at 45% opacity (use `text-base-content/45`), with a chevron collapse toggle.
  - Items: 13px, `letter-spacing:.03em` (replaces `tracking-widest`), weight 300 at rest; **active = weight 600 + `text-primary`** (active state also applies when a child route is open, e.g. People stays lit on person view/edit).
  - Count badge (e.g. Inbox 12): 10.5px, weight 600, pill, `bg-primary/14 text-primary`, `font-variant-numeric: tabular-nums`.

## 2. People grid (`shared/components/datagrid/*`, `experiences/persons/*`)

**Filtering model — chips are the single source of truth (§2):**

- Count sentence always visible under the title: `"{matched} match your filters · {total} people total"` (tabular-nums).
- **System views**: segmented control `All {n} / Donors {n} / Volunteers {n}` with counts in the labels. Replaces "narrow by type" for people. Composes with chips (AND).
- **Tags picker** (label icon) and **Issues picker** (shield-exclamation icon): dropdowns of checkboxes with per-item counts; checks combine with **OR** and land as ONE removable chip each: `"Tags: any of donor, host"` / `"Issues: any of transit"`. Footer line in dropdown: "Checked tags combine with OR and land as one chip."
- **Add filter** (dashed pill): quick single field/value chips (e.g. City is Riverton, Ward is 9).
- **Filter panel** (funnel toolbar button, right slide-over): per-field operator select (contains / does not contain / equals / does not equal / starts with / ends with / is empty / is not empty) + value. Top of panel shows **ACTIVE FILTERS** as removable chips. Opening the panel **seeds** its fields from currently applied operator-chips. Apply converts rows to chips; Clear removes only operator-chips.
- **Query builder** (adjustments icon, modal): AND/OR conjunction segmented, rows of field+op+value, add/remove rule, **live match count line**, Apply collapses to a single primary chip `"Query: Name contains a AND Ward equals 5"`. Applying clears simple filters/views.
- **Mutual exclusion with explained-disabled** (verbatim copy): QB disabled while chips exist → hover hint `"Simple filters are active — clear them to use the query builder"`; funnel disabled while a query is applied → `"The query builder owns filtering — clear its rules to use simple filters"`.
- **Empty state** (filters match nothing): funnel icon, "No results match these filters", count sentence, primary **Clear all filters** button. Clear all also resets view to All.

**Toolbar** (icon strip, grouped by thin dividers, each button has a state-aware tooltip):
`Refresh | Undo · Redo | Import CSV · Export CSV | Filters · Query builder | Columns`

- Refresh: spins behind the loading gate; result toast counts: "Grid refreshed — 43 matches, data is current".
- Undo/redo: shared mutation stack (inline edits push onto it). Tooltips **name the change**: enabled `"Undo email change for Jordan Blake"`, disabled `"Nothing to undo — edit a cell first"`. Undo restores the value and replays the saved flash.
- Import CSV: modal — drop zone → file line ("canvass-signups.csv · 131 rows · 6 columns") → column-mapping selects (CSV column → field or "— Skip this column —") with live sentence `"4 of 6 columns mapped · 2 will be skipped · 131 rows ready"` → optional "Add tags to all imported rows" → confirm button repeats scale: **"Import 131 people"**. Success toast: "Imported 131 people — 3 duplicates merged automatically, tagged \"spring-drive\"".
- Export tooltip carries the count: "Download 43 matching people as CSV".
- Columns: dropdown of checkboxes (Mobile / Address / Ward / Tags) toggling column visibility.

**Selection & bulk bar:**

- Header checkbox selects the page → success-tinted banner: `"All 13 rows on this page are selected."` + link `"Select all 43 matching rows"` → all-selected banner + `Clear selection`.
- Bulk bar (appears on any selection): `"{n} selected"` | Add tag | Export | Merge | Clone | (right, error-styled) **Delete {n} people**.
  - Merge: enabled only at exactly 2; hover hint `"Select exactly 2 people to merge — {n} selected"`.
  - Clone: enabled only at exactly 1; tooltip `"Clone {name}"` / `"Select exactly 1 person to clone — {n} selected"`. Cloning appends "(copy)" to the surname.
  - Delete: danger confirm — title "Delete 3 people?", body names what's removed, buttons: plain **"Delete 3 people"** + primary safe default **"Keep people"**.
- Bulk "Add tag" toast repeats scale: "Added spring-drive to 3 people".

**Rows:**

- **Checkbox column is 36px** — the hover-only open icon is REMOVED.
- **The name cell is the door**: click opens the record; styled `text-decoration:underline` at rest with a 22%-opacity underline color, `text-underline-offset:3px`; hover → primary. Rows with no name render **"Unnamed person"** (weight 300, 55% muted, still underlined/clickable). Implement a single `fullName()` fallback used everywhere (grid, detail title, toasts).
- **Address column** (replaces City): wrapping multi-line text, 12.5px/1.45, `overflow-wrap:break-word`, `min-width:190px` on th+td (or rely on the existing `table-layout:fixed`), `vertical-align:top`. Empty → "—".
- Inline edit: double-click cell → input, Enter commits, Esc cancels; commit triggers the existing `row-saved-flash` (color-mix success keyframe) + pushes to undo stack + toast "Saved — email updated for {name}".
- Pagination honesty: "1–13 of 43 · Page 1 of 2"; disabled pagers carry a reason in the tooltip.

**Toasts (AlertService, app-wide):** stack max 3 (oldest drops), newest at bottom; **coalesce** identical message+type into one toast with a `×N` count pill and a refreshed timer; max-width 520px, wrap to 3 lines then ellipsis (`overflow-wrap:anywhere`), icon pinned to first line.

## 3. Person view (`persons/ui/person-view.html`, `pc-detail-layout`)

- Title = **record's real name** (never "Person Profile"); eyebrow `PERSON` (10.5px, 600, .1em tracking, 45% muted); status chip beside the name (success-tinted, e.g. "Monthly donor").
- Header right: **record pager** `"4 of 43 filtered"` with prev/next that walk the grid's current filtered set; divider; primary **Edit person**; **⋯ overflow** containing Export vCard, Merge into another person…, divider, error-colored **Delete person…** → danger confirm ("Keep person" is the primary safe default; body names counts: "removes her profile, 12 donation records and 5 email threads").
- Tabs carry counts: `Activity 8 · Donations 12 · Emails 5 · Volunteer 3 · Household 0` (pill tabs, active = primary tint + 600).
- Left card: contact rows (icon + micro-label + value; copy buttons always visible at low opacity); **ADDRESS value is a link** → opens the Household tab/record; TAGS chips (secondary tint) + **ISSUES OF INTEREST** chips (info tint) — issues empty state is a link: "No issues yet — add what they care about" → edit.
- Household empty tab = guided empty state: house icon, "Not part of a household yet", cause sentence (CSV-import address), primary **Assign household**.

## 4. Person edit (`persons/ui/person-form.*`)

- Header: eyebrow EDIT PERSON, record name, **dirty chip** (warning tint + dot): `"Unsaved changes · {n} fields"` — dirty tracked against a snapshot of ALL fields incl. tags/issues.
- Fields: First/Last name, Primary email (validated), Secondary email, Mobile, Home phone, Company, Preferred contact (select), Address (read-only), Tags, Issues, Internal notes.
- **Save never disables.** Invalid email → inline coach as the user types (error icon + "Enter a valid email address, like name@example.org", error border); clicking Save focuses the first invalid field. Save toast names the fields: "Saved Amira Hassan — email and mobile phone updated".
- **Leave guard** (any navigation while dirty): "Leave without saving?" / "Your changes to {name} — {field list} — will be lost." Buttons: plain "Discard changes", primary **"Keep editing"**.
- **Tags & Issues editors** — same idiom, different tint (tags secondary, issues info): chip row with × removes, inline input "Type and press Enter to add", dashed **suggestion** chips below (existing values not already applied). Keep them separate fields — issues power issue filtering/targeting.
- **Address is not an input**: read-only surface (base-200 bg, map-pin icon) + reason line "Addresses belong to households, so everyone at the same address stays in sync." + link **"Edit on household"**.

## 5. Inbox (`experiences/emails/*`)

**Layout (desktop):** folders panel (collapsible) | list (280–320px) | detail (**min-width 340px** — never let it collapse to 0) | **person context rail** 236px. All fixed-width panes use `box-sizing:border-box`.

- **Folders panel:** triage views with icons+counts (Open/inbox, Mine/user-circle, Unassigned/exclamation-circle, Closed/check-circle) + collapsible **FOLDERS** section (Sent, Drafts, Spam, **Trash**). Two collapse behaviors (mirrors `foldersCollapsed`/`realFoldersCollapsed`): ⟪ chevron folds the whole panel to a 54px icon rail (tooltips carry "Open · 12"); the FOLDERS header chevron folds just the real folders. **New email** button and **Sync now** (+ "Synced 2 min ago" evidence line; spinner behind loading gate; result toast counts: "Inbox synced — 2 new emails in Open, 1 thread updated").
- **List:** SORT header (Newest/Oldest first toggle); rows: unread dot + bold-when-unread, sender, time-ago, subject + paper-clip when attachment, preview line, status chip (Unassigned=warning / Assigned=info / Closed·In Trash=neutral). Selecting marks read.
- **Detail header:** subject (truncate) + status chip; row: Assigned-to select · date · action cluster:
  - **Reply menu** — ONE button (reply icon + small chevron) opening Reply / Reply all / Forward. Not three buttons.
  - Close/Reopen toggle (check icon, success when closed; tooltip "Close conversation"/"Reopen conversation").
  - Delete → moves to Trash (toast "Moved \"…\" to Trash"); in Trash the cluster adds **Restore** and delete becomes "Delete forever".
  - **⋯ menu:** Create task…, ─, **Star/Unstar** (demoted here — not first-class), Mark as unread, Mark as spam, ─, Print.
- **Create task dialog:** title prefilled `"Follow up: {subject}"`, assignee select, due date; sub-line "The email thread stays linked to the task"; success toast repeats all three facts.
- **Sender line:** initial avatar + name → links to the person record (underlined at rest); email; "to Riverton Campaign <…>"; **Expand** icon → full-screen reading overlay (blurred base-100, ~860px column, header meta line, **Collapse** button returns).
- **SLA pill** on every thread: "First response due in 5h · 8h SLA" / "…sent in 1.2h · within SLA" / "Closed within SLA".
- **Body owns the space:** body pane is `flex:1` scrollable. Below it, **Comments and Activity are a quiet tab row** (not stacked bars): `[icon] Comments {n}   [icon] Activity {n}` — 12.5px text links with count pills; active = primary + 600 + 2px primary underline on the row's baseline border; a small underlined **Hide** link appears at the right ONLY while a panel is open. Panels open below (bordered card, max-height 240/200, drop animation): comments = named+timed entries, composer (Enter or "Add comment" button), footer "Comments are internal — the sender never sees them."; activity = icon timeline (received → synced → matched → assigned → commented → closed) with times.
- **Person context rail** (right, 236px, base-200): PERSON CONTEXT header + ⟫ collapse; avatar, name (door), "Donor · Ward 5", card with email + "Last inbound 2h ago", TAGS chips, ISSUES chips ("None yet" fallback), **Open record** button. Collapsed = 48px strip keeping the avatar initials (tooltip "Expand person context — {name}") + ⟪. While the rail is on, the folders panel **defaults to its icon rail** (user can re-expand) and the list narrows to 280px.

## 5a. Personal Settings & Workspace settings (two tiers, two verbs)

**Naming ruling:** sidebar SYSTEM item is **"Workspace"** (page title "Workspace settings", WORKSPACE eyebrow); the avatar menu item is **"Settings"**. Retire the Configuration/Settings synonym pair; your current tenant-scoped `/settings` content moves under Workspace, personal prefs move to the popup.

**Settings (personal) — compact popup from the avatar, ~430px, INSTANT APPLY.** No Save/Reset buttons; footer narrates the contract ("Changes apply instantly — nothing to save" → success-colored "Saved just now" on any change). Header states scope: "Personal to you — nothing here affects teammates." Three sections:

1. **Notifications** — the Email/In-App **toggle matrix** (your existing My Notification Preferences model): one row per event (Mentioned in comment, Task assigned, Task due today/overdue, Person assigned, Export ready, Import summary) with helper line + two checkbox columns under EMAIL / IN-APP headers. Sentence-case labels.
2. **Appearance** — Theme (Light/Dark segmented, live) and Density (Comfortable/Compact) segments.
3. **Passkeys** — list of registered keys (device · method · added · last used) each with an error-styled Remove whose toast names the consequence ("it can no longer sign in"); guided empty state; dashed "Add passkey" button (WebAuthn device prompt).
   Growth rule: ≤3 sections = single scroll column; 4+ = widen to a two-pane modal with a left mini-rail (same rail idiom as Workspace); beyond that it's a page.

**Workspace settings (admin) — full page, DELIBERATE SAVE.** Left rail (224px: icon + title, active = primary tint + 600) listing the sections from `settings.config.ts` (Organization, Communications, Notifications, Teams & access, Service levels, Donations, Integrations & API); right card renders the active section's fields by type with helper lines (incl. consequence copy: "Changing this re-evaluates the 12 open conversations…", bounce-list count beside its toggle). **Same dirty machinery as person edit:** warning chip "Unsaved changes · N fields", primary **Save settings** (toast names the fields), Cancel reverts with narration, leave guard names the subject ("Your changes to the workspace settings — email SLA — will be lost", "Keep editing" primary). North-star addition: **per-section dirty dots** — any section holding unsaved changes shows a warning dot in the rail, so dirty state is visible from other sections. Vertical rail, never top tabs, at this section count.

## 6. Mobile patterns (phone-frame screens in the prototype)

Bottom tab bar (People | Inbox, 52px) — reachable via the "mobile design →" pills on the People header and the Inbox folder panel (the latter lands on the Inbox tab). Grid: burger menu consolidating the toolbar — **disabled items keep their reason as inline sub-text** (no hover on touch); segmented views with counts; a horizontally scrollable filter row of dashed buttons — **Tags · Issues · Filters · Query** — where Tags/Issues open bottom sheets (44px checkbox rows, counts, "Done") and Filters/Query open the same panel/builder as desktop (mutual exclusion adapted for touch: the locked button dims and TAPPING it narrates the reason as a toast); selection bulk bar → Add-tag bottom sheet whose confirm repeats scale ("Add 2 tags to 3 people"); name underlined as the door. Inbox: stacked panes (counted folder chips → full-width list with unread dots → detail behind a real back button that preserves list state); full-width 44px **Reply / Close conversation** buttons. Everything ≥44px.

## 7. Acceptance checklist for the implementer

1. Toggle dark theme on every changed surface — zero hardcoded hues (color-mix over semantic vars only).
2. Every disabled control names its unmet condition (tooltip on desktop, inline text on touch).
3. Every count in this doc renders with `tabular-nums`.
4. Every destructive dialog styles the SAFE action as primary.
5. All copy sentence case, verb + noun, numbers when acting on sets — lift strings from the prototype verbatim.
6. Animations: only the existing `animate-*`/flash vocabulary + `prefers-reduced-motion` guard (see UX-GUIDELINES).
