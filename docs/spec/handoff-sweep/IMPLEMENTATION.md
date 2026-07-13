# pplCRM — UX Sweep: Implementation Handoff

**Additive to** `handoff/IMPLEMENTATION.md` + `UX-GUIDELINES.md` (rules apply verbatim) and `handoff-newsletter/NEWSLETTER.md`. Source of truth: `pplCRM North Star.dc.html` (current state).

## 1. Navbar rework

- **Breadcrumbs move INTO the navbar** (left side); the standalone breadcrumb row is deleted — one full band returned to content. Crumbs keep real names, no fake Home, last crumb weight 500; on record pages the mono route slug rides along. Overflow rule: container `overflow:hidden`; each crumb label `min-width:0;overflow:hidden;text-overflow:ellipsis`; earlier crumbs get `flex-shrink:4` vs `1` on the last so the record name keeps priority ("Pe… / Amira Hassan", never text painting under neighbors).
- **Search collapses to an icon** (user-approved pattern, kept): the navbar icon and **⌘K** open the inline search field (autofocus, empty-blur collapses). The **command palette** gets its own shortcut: **⌘⇧K** (its footer advertises it; the search icon's tooltip names both).

## 2. Command palette (⌘⇧K)

Centered overlay (560px, top 14%, drop entrance), autofocused input, `esc` hint chip, footer "Enter runs the first result".

- **Actions** (always listed, filtered by query): Go to Dashboard / People / Inbox / Newsletters / Workspace settings, Create newsletter, Toggle dark mode, Open settings. Every action label is the same verb+noun the UI uses.
- **With a query**: matching **people** (max 4, open the record) + a final **Search** item — `Filter People by "q"` — which lands on the grid with the query applied.
- **Grid search state becomes a chip**: an active search shows in the People chips row as `Search: "q"` (removable, counts recompute) — filter truth stays in one place.
- Enter = first result; esc/backdrop closes; each result row: icon · label · kind tag (Action/Person/Search).
- Implementation: register actions centrally so new screens auto-appear; fuzzy-match people server-side later (prototype uses `includes`).

## 3. Global polish

- **`:focus-visible` ring** (in the base stylesheet): `outline:2px solid var(--color-primary); outline-offset:2px` — every interactive element, keyboard only, both themes.
- **Tab title carries state**: `document.title = "{Screen} — pplCRM"`, with live counts where they exist (`Inbox (12) — pplCRM`). Update on navigation and count changes.
- **Skeletons over spinners**: while a surface refreshes, values swap to layout-shaped pulsing blocks (see dashboard stat tiles during Reload: 64×24 rounded block, `flash 1.2s infinite`, base-content 8% tint) — behind the loading gate as always. Never a centered spinner for content that has a known shape.
- **Optimistic mutations + undo (spec)**: assign/tag/close apply instantly with saved-flash feedback; extend the grid's undo-stack idiom to inbox assign and bulk tag. Undo tooltips name the change.
- **Scroll & state restoration (spec)**: back means back — grid filters/page/scroll (already doctrine), plus inbox list scroll position and wizard step. Implement via the existing route-reuse strategy.
- **First-run checklist**: dashboard card "GETTING STARTED · 2 of 3 done" — completed steps get success checks with their evidence ("5,012 imported", "hello@riverton.vote verified"), the next step is a primary link ("Send your first newsletter" → wizard). Dismissible, with the toast noting where it lives afterwards. Drives day-one trust.

## 4. Sidebar collapse (from the prior round, for completeness)

⟪⟫ toggle **visible at rest** at the sidebar foot (never hover-revealed); collapsed = 60px icon rail: tooltips carry label + count ("Inbox · 12"), badges become 6px primary dots, section headings become hairline dividers (tooltip = section name), logo → compact mark (note: optimize the 689KB `logo-sq.svg`), active state survives (primary icon + weight). **Drop hover-to-peek width expansion** (`hover:md:w-44`) — layout motion + accidental expansion.

## 5. Explicitly declined — do not build

- **Density preference** (owner decision): light + dark are the only modes to test/maintain. Remove the Density segment from the Settings popup when implementing (the prototype still shows it; ignore it).

## Acceptance

1. ⌘⇧K opens the palette from every screen; ⌘K opens inline search; Enter on first result; esc closes; dark theme pass.
2. Tab through a page: exactly one ring style everywhere.
3. Kill the network mid-refresh: skeletons, not spinners, and nothing lies.
4. Crumbs at 900px width: ellipsis, never overlap; record name survives longest.
5. Search applied via palette shows as a removable chip on the grid.
