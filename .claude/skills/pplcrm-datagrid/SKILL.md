---
name: pplcrm-datagrid
description: "How PeopleCRM's custom DataGrid (pc-datagrid) works and how to build/extend a grid page: the AbstractAPIService DI contract, ColumnDef shape, server-side fetch options, inline editing with undo + cell flash, selection/bulk actions, the grid→detail record-navigation handoff, and the DI traps that break grid tests. USE WHEN adding a list/grid page for an entity, adding or changing grid columns, wiring inline editing or a custom cell renderer, changing toolbar actions (delete/export/import/add), debugging a grid that loads nothing, or writing tests that touch a grid. EXAMPLES: 'add a grid for the campaigns entity', 'make the status column editable', 'why does my grid test never call getAll'."
---

# PeopleCRM DataGrid (`pc-datagrid`)

The grid is a **house-built component**, not AG Grid — `ColumnDef` mimics a slice of AG Grid's
API for familiarity, but only what `grid-defaults.ts` declares actually works. Everything lives
in `apps/frontend/src/app/shared/components/datagrid/`: `datagrid.ts` (the `DataGrid`
component), `controllers/` (fetch, editing, keyboard, pinning, reorder, resizing, virtualizer),
`services/` (data, filters, selection, columns, tag-options, …), `ui/` (toolbar, filter
dropdowns/panel, row), `undo-redo-mgr.ts`, and `datagrid.tokens.ts` (config token).

## The DI contract: the grid finds its data source itself

A grid page never passes data in. `FetchController` (and other grid services) `inject(AbstractAPIService)`,
so the hosting component **must provide the entity service under that token** plus the config token:

```ts
// teams-grid.ts — the minimal real consumer; copy this shape
providers: [
  { provide: AbstractAPIService, useExisting: TeamsService },
  provideDataGridConfig({ messages: { exportEntity: 'teams', exportFileName: 'teams-export.csv' } }),
],
```

Template: `<pc-datagrid title="Teams" [colDefs]="col" [disableDelete]="false" [disableView]="false"
[addRoute]="'add'" plusIcon="add-group">`. Toolbar features are opt-in/out via inputs —
`disableDelete`/`disableView`/`disableExport`/`disableImport`/`disableMerge`/`disableRefresh`,
`allowFilter`, `enableSelection`, `rowCanSelect`, `showToolbar`, `showArchiveIcon` — read the
input block in `datagrid.ts` for the full list before adding a new input; the flag you want
probably exists. `provideDataGridConfig` merges per-grid copy (delete/export dialog text,
failure messages) and `pageSize` over `DEFAULT_DATA_GRID_CONFIG` (`datagrid.tokens.ts`).

Simple grid: `teams-grid.ts`. Full-featured grid (CSV import, tag options, custom delete
confirm, loading gate): `persons-grid.ts`.

## Columns: `ColumnDef` in `grid-defaults.ts`

`{ field, headerName, editable }` is the common case. Also supported: `valueFormatter`
(display), `valueGetter`/`valueSetter` (read/write indirection), `cellRenderer` (returns string
or `HTMLElement`), `cellClass`, `comparator`, `hide`, `tagColumn`, `onCellClicked`,
`isCellInteractive`. Props beyond that interface are silently ignored — don't paste AG Grid
options and expect them to work. Rows are `GridRow = Record<string, unknown>` (`types.ts`);
formatters/getters receive `CellParams` (`data`, `value`, `newValue`, `colDef`).

## Fetching is server-side; the grid only holds a page

`FetchController.loadPage` assembles `getAllOptions` — search term, tag/issue filters, the
column filter model, advanced-filter model (query builder), sort state, archive mode, `listId` —
and calls `AbstractAPIService.getAll` / `getAllArchived`, all inside the grid's own loading
gate. `totalCountAll` comes from the response `count`; paging math derives from it. So:

- A grid that renders but never shows rows usually means the `AbstractAPIService` provider is
  missing/wrong, not a template bug. Fetch failures toast `config.messages.loadFailed`.
- New filter behavior belongs in the options the backend understands (see `getAllOptionsType`
  in `libs/common`) — not in client-side row filtering.

## Inline editing: optimistic, undoable, flashed

`EditingController.commitSingleCell` is the whole story: honor `valueSetter` if present,
otherwise assign; skip if unchanged; call `AbstractAPIService.update(id, payload)`; **on failure
revert the row, pop the undo snapshot, toast "Update failed"**; on success update row caches,
toast "Row updated", and flash the cell (`triggerCellFlash` → `td.cell-flash` keyframe in
`datagrid.css`, the canonical success-feedback motion from `pplcrm-design-principles` §7).
Undo/redo (`undo-redo-mgr.ts`) snapshots rows/selection/filters/sorting/paging as
`GridSnapshot` (`types.ts`) around every commit — if you add a new mutation path, push a
snapshot the same way or undo will skip your change. Rows with `deletable: false` block edits
to `name` (`shouldBlockEdit`).

## Selection, bulk actions, and the grid→detail handoff

Selection state is a `selectedIdSet` in `GridStoreService`; `selectAllMatching()` asks the
backend for **all ids matching the current filters** (not just the page), enabling the
"all N matching" selection sentence and bulk actions. Delete/export run through
`ConfirmDialogService` with copy from the config token.

On record open the grid calls `captureRecordNavContext(entityKey)` →
`fetchCtrl.selectAllMatching()` → `recordNav.setContext(entityKey, ids, count)`. That context is
what powers the detail page's "N of M filtered" pager and J/K navigation — consumption side is
owned by `pplcrm-page-layout-ux`. If prev/next is missing on a detail page, check this handoff
fired (it requires arriving via the grid, by design).

## Test traps (all three have burned real sessions)

1. **Provide service mocks via DI, at TestBed setup.** `FetchController` injects
   `AbstractAPIService` itself — swapping a service property on the component instance after
   creation silently misses the fetch path. Use
   `providers: [{ provide: AbstractAPIService, useValue: mock }]`.
2. **`whenStable()` does not flush the grid's init.** `ngOnInit` kicks off fire-and-forget
   async work that `whenStable()` doesn't track — flush with `setTimeout`/tick loops before
   asserting on rows.
3. Components that render `pc-record-activities` alongside a grid need an `ActivityService`
   mock or TestBed creation fails.

General Vitest conventions → `pplcrm-testing`.

## Non-goals

- **Detail-page composition and the pager that consumes the nav context** → `pplcrm-page-layout-ux`.
- **Design rules the grid already embodies** (filter chips, empty state, saved-flash motion,
  semantic tokens) → `pplcrm-design-principles`; don't restyle the grid against them.
- **The backend `getAll` implementation** behind `AbstractAPIService` → `pplcrm-trpc-backend`.
- **Adding the whole entity the grid lists** (service, routes, detail view) → `pplcrm-add-entity`;
  this skill is only the grid step.
