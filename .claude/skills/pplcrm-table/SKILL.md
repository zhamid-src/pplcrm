---
name: pplcrm-table
description: The lightweight presentational table shell (pc-table) and the shared token contract every tabular surface obeys. USE WHEN building a non-datagrid table (an admin/vocabulary/ledger list), styling any table, deciding between pc-datagrid and pc-table, changing table header/density/border look, or touching the .pc-table token contract in styles.css. EXAMPLES 'add a table to the settings page', 'why are my table headers not micro-caps', 'make this bespoke table match the grids', 'change the table row density everywhere'.
---

# pc-table & the shared table token contract

Two tools render tabular data in this app, and they deliberately share one **visual
contract** so every table reads as the same product (design §4 "one idiom per job", §8
typography). Pick the right one, and never hand-roll a third table look.

## Which one?

| Use                                                                    | When                                                                                                                                                                                                                                                            | It owns                                                                                                                                                  |
| ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`pc-datagrid`** (`apps/frontend/src/app/shared/components/datagrid`) | A generic, homogeneous "rolodex" of records: persons, companies, households, users, lists, newsletters, events, shifts, tasks, teams, campaigns, deliveries, forms, files, workflows.                                                                           | Server-side fetch/sort/filter, inline editing + undo, selection → bulk actions, CSV export/import, grid→detail record-navigation. See `pplcrm-datagrid`. |
| **`pc-table`** (`libs/uxcommon/src/components/table/table.ts`)         | A bespoke table whose interaction idiom does **not** fit a generic column grid — admin/vocabulary tables (Tags, Issues), a financial ledger (Donations, Pledges), anything with merge/rename actions, callouts, proportional bars, aggregates, or custom cells. | **Chrome only**: the bordered shell, the micro-caps header row, cell density, the skeleton-loading idiom, an optional footer. Nothing else.              |

**Do not force a bespoke table into `pc-datagrid`** — you will re-implement its escape hatches
and lose. **Do not hand-roll a raw `<table>`** — you will drift off the shared look (this is
exactly the drift `pc-table` was created to end: Tags/Issues/Donations had three different
shells, header styles, hovers and loading treatments before the 2026-07-09 unification).

## The shared token contract (single source of truth)

Defined **globally** in `apps/frontend/src/styles.css` — a `:root` custom-property block plus a
`@layer components` block with `.pc-table-shell` and `.pc-table`:

- `--pc-table-header-size` (10.5px) / `--pc-table-header-tracking` (0.07em) → the refined
  micro-caps header eyebrow (§8). Applied via `.pc-table thead th`.
- `--pc-table-cell-py` (0.375rem) → row density. Applied via `.pc-table :where(th, td)`.
- `--pc-table-radius` (0.75rem) + `border-base-300` + `bg-base-100` → the `.pc-table-shell`.
- `.pc-table tbody tr:hover` → a subtle `base-200` row hover.

**Change a value here and every table — both `pc-table` and the datagrid — moves together.**
That is the whole point. Never re-introduce a per-table header size, shell border, or hover.

Why global (not component-scoped CSS): `pc-table` **projects** each page's bespoke `<tr>`/`<td>`
into its own `<tbody>`, and Angular's emulated encapsulation cannot reach projected rows. Global
component classes reach both the projected content and the datagrid's own markup — which is what
lets one contract cover both.

### How the datagrid consumes it

`datagrid.html`'s `<table>` carries `class="table pc-table …"` and its `<th>` no longer sets
`text-xs uppercase font-medium` (the `.pc-table thead th` rule now provides the micro-caps);
`datagrid.css` reads `padding-block: var(--pc-table-cell-py)`; the scroller border is
`border-base-300`. The datagrid keeps its **zebra striping + `hover:bg-base-300`** — a deliberate
scale adaptation for long data tables that overrides the shared hover from the Tailwind utilities
layer. Zebra is _not_ part of the shared chrome; short admin tables don't want it.

## Using pc-table

Import `Table` from `@uxcommon/components/table/table` (exported from `@uxcommon` too) and add it
to the component `imports`. The consumer keeps full control of every cell and of the **empty
state** (per-entity by design — §3: name the cause + one action; a shared empty state would be
wrong).

```html
<pc-table [loading]="loading()" [columns]="5" [skeletonRows]="5">
  <!-- header cells → projected into <thead><tr> -->
  <ng-container pcTableHead>
    <th>Tag</th>
    <th>People</th>
    <th>Last applied</th>
    <th class="w-10"></th>
  </ng-container>

  <!-- default slot: body rows + this page's own empty state. Rendered only when NOT loading;
       pc-table shows skeleton rows while loading() is true, so DO NOT also render a skeleton here. -->
  @if (visibleRows().length === 0) {
  <tr>
    <td colspan="5" class="py-12 text-center">…guided empty state with one action…</td>
  </tr>
  } @else { @for (row of visibleRows(); track row.id) {
  <tr [class.animate-saved-flash]="highlightId() === row.id">
    …bespoke cells…
  </tr>
  } }

  <!-- optional: caption/pagination hint inside the shell, below the table -->
  <div pcTableFooter class="px-4 py-3 text-xs text-base-content/50 border-t border-base-200">
    Showing the latest {{ shown() }} of {{ total() }}
  </div>
</pc-table>
```

Inputs: `columns` (required — colspan for skeleton rows), `loading` (default false),
`skeletonRows` (default 5). Slots: `[pcTableHead]`, default (body), `[pcTableFooter]`.

### Traps

- **`columns` must equal the real column count** or the loading skeleton won't span the table.
- **Don't render your own skeleton** in the default slot — pass `[loading]` and let `pc-table` do
  it, or you get double indicators (§4). If a page already shows a top `progress` bar for load
  (e.g. Donations), leave `loading` unset so you don't stack two indicators.
- **Saved-row flash** is the app-wide `animate-saved-flash` utility toggled by the consumer — not
  something `pc-table` owns. Reuse it for mutation feedback (§7).
- **Conditional `<ng-content>` is fine** here (Angular 22 control flow) — that's how the body slot
  is hidden during load; see `tool-button.ts` for the same pattern.

## Consumers today

Tags (`experiences/tags/ui/tags-admin.html`), Issues (`…/issues-admin.html`), Donations
(`experiences/donations/ui/donations-grid.html`) and Pledges (`…/pledges-grid.html`). Read one
before adding the next — copy the proven structure.
