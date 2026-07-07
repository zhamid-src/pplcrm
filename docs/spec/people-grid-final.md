# People grid — final visual source of truth (owner screenshot, 2026-07-08)

The owner supplied a screenshot that **supersedes spec §5's grid layout** where they
differ. Spec §5 is the guideline; this screenshot is the binding target. Get as
pixel-perfect as possible.

## Layout, top to bottom (main content area)

1. **Grain tabs row** (left) + **toolbar** (right), same horizontal band.
   - Grain tabs: `People 5,012` (active — primary color, underlined) · `Households 1,890` · `Companies 214` (muted). Counts in labels, tabular-nums. (Already built, Wave 0 — keep.)
   - Toolbar: a single rounded/bordered button group, right-aligned, containing in order:
     Refresh (circular-arrows) · Undo (dimmed when unavailable) · Redo (dimmed) · divider · Import/Export (up-tray) · divider · **Filter funnel — tinted primary/active when any filter is applied** · Filter-panel (adjustments/sliders) · Columns. Then a gap and a solid **`+ Add person`** primary button OUTSIDE the group.

2. **Filter chip row** (its own line, NO surrounding border/background box — sits on the page):
   - A small muted **funnel icon** at the far left (not the word "Filters").
   - Active filter chips, e.g. `City: Riverton ✕` — soft primary fill (`bg-primary/10 text-primary`), rounded, with an `✕` remove button.
   - `Clear all` — plain primary text link, immediately after the chips (NOT right-aligned).
   - `+ Add filter` — **dashed-border pill**, muted, `+` icon (quick single field/value chip entry).
   - `Tags` — dashed-border pill, tag/label icon (opens the OR checkbox picker).
   - `Issues` — dashed-border pill, shield icon (opens the OR checkbox picker).
   - `Lists` — dashed-border pill, list/lines icon (apply a saved list as a chip).
   - All four dashed pills are always present (filter entry points), sitting inline after `Clear all`.

3. **NO All/Donors/Volunteers segmented control.** The screenshot does not show it; the dashed Tags/Issues/Lists pills replace it. Remove/hide `showNarrowTypeFilter` on the People grid (donor/volunteer are just tag filters now).

4. **Count sentence**: `128 match your filters · 5,012 people total` — muted, tabular-nums, its own line under the chip row.

5. **Grid**:
   - Header: select-all checkbox · `NAME ↑` (sortable, name-as-door) · `EMAIL` · `MOBILE` · `ADDRESS` · `WARD` · `TAGS`. Muted uppercase headers.
   - Name cell = the door: bold, underlined.
   - Address cell: wraps to 2 lines; **underlined only when the row links to a real household** (placeholder/no-household rows are plain text).
   - Tags: soft green chips (`badge-success` soft) — donor, volunteer, canvasser, host.
   - Rows are tall enough for the wrapped 2-line address; quiet row separators.

## Sidebar (confirms Wave 0 IA + populated count badges)

- Dashboard · WORK (Inbox **12**, Tasks **3**, People) · OUTREACH (Newsletters, Lists, Forms, Donations) · FIELD (Canvassing, Deliveries **23**, Teams) · DATA (Import / export, Duplicates **2**, Tags…).
- Count badges are populated with real tenant-scoped counts (Inbox open, Tasks SLA-breach, Deliveries ready, Duplicates queue). Wave 0 left these as TODOs — wire them as the data sources land (Duplicates via Track D `duplicates.countQueue`; Tasks via `tasks.countSlaBreaches`; Deliveries via Track G; Inbox open count needs a source).

## Notes

- Everything else (semantic tokens, dark theme, tabular-nums, sentence case) per `handoff/UX-GUIDELINES.md`.
- Name-as-door navigation target is owned by the person opaque-`public_id` work — do not change door navigation here.
