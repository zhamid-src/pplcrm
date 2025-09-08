import { ChangeDetectionStrategy, Component, OnInit, AfterViewInit, OnDestroy, ViewChild, ElementRef, effect, inject, input, output, signal } from "@angular/core";
import { createTable, ColumnDef as TSColumnDef, getCoreRowModel, type SortingState, type Updater } from '@tanstack/table-core';
import { Virtualizer, elementScroll, observeElementRect, observeElementOffset } from '@tanstack/virtual-core';
import { ActivatedRoute, Router } from "@angular/router";
import { getAllOptionsType } from "@common";
import { Icon } from "@icons/icon";
import { PcIconNameType } from "@icons/icons.index";
import { AbstractAPIService } from "@services/api/abstract-api.service";
import { SearchService } from "@services/api/search-service";
import { ConfirmDialogService } from "@services/shared-dialog.service";
import { AlertService } from "@uxcommon/components/alerts/alert-service";
import { createLoadingGate } from "@uxcommon/loading-gate";

import { confirmDeleteAndRun, doExportCsv } from "./datagrid.actions";
// AG Grid callbacks/datasource removed in TanStack swap
import { navigateIfValid, viewIfAllowed } from "./datagrid.nav";
import { DATA_GRID_CONFIG, DEFAULT_DATA_GRID_CONFIG, type DataGridConfig } from "./datagrid.tokens";
import { createPayload } from "./datagrid.utils";
import { type ColumnDef as ColDef, SELECTION_COLUMN, defaultGridOptions } from "./grid-defaults";
import { GridActionComponent } from "./tool-button";
import { UndoManager } from "./undo-redo-mgr";
//import { ThemeService } from 'apps/frontend/src/app/layout/theme/theme-service';
import { Models } from "common/src/lib/kysely.models";

@Component({
  selector: 'pc-datagrid',
  imports: [Icon, GridActionComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './datagrid.html',
})
export class DataGrid<T extends keyof Models, U> implements OnInit, AfterViewInit, OnDestroy {
  private readonly config = inject<DataGridConfig>(DATA_GRID_CONFIG, { optional: true }) ?? DEFAULT_DATA_GRID_CONFIG;
  private readonly dialogs = inject(ConfirmDialogService);
  private readonly route = inject(ActivatedRoute);
  private readonly searchSvc = inject(SearchService);

  //private readonly themeSvc = inject(ThemeService);
  private _loading = createLoadingGate();

  // Other State
  private lastRowHovered: string | undefined;
  private oldFilterText = '';

  // Injected Services
  protected readonly alertSvc = inject(AlertService);
  protected readonly countRowSelected = signal(0);
  protected readonly distinctTags: string[] = [];
  protected readonly gridSvc = inject<AbstractAPIService<T, U>>(AbstractAPIService);

  // State & UI Signals
  protected readonly isRowSelected = signal(false);
  protected readonly router = inject(Router);
  protected readonly undoMgr = new UndoManager();

  // Select-all-across-results state
  protected allSelected = signal(false);
  protected allSelectedCount = 0;
  protected allSelectedIdSet: Set<string> = new Set();
  protected allSelectedIds: string[] = [];
  protected archiveMode = signal(false);
  protected colDefsWithEdit: ColDef[] = [SELECTION_COLUMN];
  protected isLoading = this._loading.visible;
  protected mergedGridOptions: any = {};
  protected pageIndex = signal(0);
  protected selectedIdSet = signal<Set<string>>(new Set());
  protected showFilters = signal(false);
  protected showFilterPanel = signal(false);
  protected filterValues = signal<Record<string, any>>({});
  protected panelFilters = signal<Record<string, { op: 'contains' | 'equals'; value: any }>>({});
  protected colWidths = signal<Record<string, number>>({});

  // Table state (TanStack-like minimal state)
  protected rows = signal<Partial<T>[]>([]);
  protected sortCol = signal<string | null>(null);
  protected sortDir = signal<'asc' | 'desc' | null>(null);
  protected sorting = signal<SortingState>([]);
  protected colVisibility = signal<Record<string, boolean>>({});
  protected totalCountAll = 0;
  protected rowHeight = 36;
  protected viewportH = signal(0);
  protected scrollTop = signal(0);
  private tsTable: ReturnType<typeof createTable> | undefined;
  private tsColumns: TSColumnDef<any, any>[] = [];
  private virtualizer: Virtualizer<HTMLDivElement, Element> | undefined;

  public readonly importCSV = output<string>();
  public readonly showArchiveIcon = input<boolean>(false);
  public readonly updateUndoSizes = this.undoMgr.updateSizes.bind(this.undoMgr);

  // Inputs & Outputs
  public addRoute = input<string | null>(null);
  public allowFilter = input<boolean>(true);
  public colDefs = input<ColDef[]>([]);
  public disableDelete = input<boolean>(true);
  public disableExport = input<boolean>(false);
  public disableImport = input<boolean>(true);
  public disableRefresh = input<boolean>(false);
  public disableView = input<boolean>(true);
  public enableSelection = input<boolean>(true);
  public gridOptions = input<any>({});
  public limitToTags = input<string[]>([]);
  public plusIcon = input<PcIconNameType>('plus');
  public showToolbar = input<boolean>(true);

  constructor() {
    effect(() => {
      // no-op; AG Grid api removed
    });
    // React to global search (SSRM: trigger server-side filter)
    effect(() => {
      const quickFilterText = this.searchSvc.getFilterText();

      // Keep track of the old filter text to avoid unnecessary roundtrip
      if (quickFilterText != this.oldFilterText) {
        this.oldFilterText = quickFilterText;
        this.loadPage(0);
      }
    });
  }

  @ViewChild('scroller', { static: false }) private scroller?: ElementRef<HTMLDivElement>;
  @ViewChild('gridTable', { static: false }) private gridTable?: ElementRef<HTMLTableElement>;

  public ngAfterViewInit() {
    const el = this.scroller?.nativeElement;
    if (el) this.viewportH.set(el.clientHeight || 0);
    if (el) {
      this.virtualizer = new Virtualizer<HTMLDivElement, Element>({
        count: this.rows().length,
        getScrollElement: () => el,
        estimateSize: () => this.rowHeight,
        overscan: 6,
        // required observers + scroller for DOM elements
        scrollToFn: elementScroll,
        observeElementRect,
        observeElementOffset,
        // measureElement can be supplied later for variable-height rows
      });
    }
    // Measure header widths initially and on resize
    queueMicrotask(() => this.updateHeaderWidths());
    window.addEventListener('resize', this.updateHeaderWidths);
  }

  public ngOnDestroy(): void {
    // Abort any inflight requests and release refs
    try { this.gridSvc.abort(); } catch {}
    this.virtualizer = undefined;
    this.tsTable = undefined;
    window.removeEventListener('resize', this.updateHeaderWidths);
  }

  /** Confirm and then delete selected rows */
  public async confirmDelete(): Promise<void> {
    if (this.disableDelete()) {
      this.alertSvc.showError(this.config.messages.noDeletePermission);
      return;
    }

    await confirmDeleteAndRun({
      _loading: this._loading,
      dialogs: this.dialogs,
      alertSvc: this.alertSvc,
      api: undefined as any,
      getSelectedRows: () => this.getSelectedRows(),
      gridSvc: this.gridSvc,
      rowModelType: 'serverSide',
      mergedGridOptions: this.mergedGridOptions,
      config: this.config,
    });

    // Always clear our select-all cache after a delete attempt
    this.clearAllSelection();
    await this.refresh();
  }

  public getCountRowSelected() {
    return this.countRowSelected();
  }

  /** Expose current grid filters/sort to build a definition */
  public getDefinition(): getAllOptionsType {
    return {
      searchStr: this.searchSvc.getFilterText(),
      sortModel: this.sorting().map((s: any) => ({ colId: s.id, sort: s.desc ? 'desc' : 'asc' })),
      filterModel: this.buildFilterModel(),
      tags: this.limitToTags(),
    } as getAllOptionsType;
  }

  /** Utility: returns selected rows from grid */
  public getSelectedRows() {
    if (this.allSelected()) {
      return this.allSelectedIds.map((id) => ({ id })) as unknown as (Partial<T> & { id: string })[];
    }
    const ids = this.selectedIdSet();
    return Array.from(ids).map((id) => ({ id })) as unknown as (Partial<T> & { id: string })[];
  }

  public async ngOnInit() {
    const allowFilter = this.allowFilter();
    this.mergedGridOptions = {
      ...defaultGridOptions,
      rowModelType: 'serverSide',
      suppressHeaderMenuButton: !allowFilter,
      ...this.gridOptions(),
    };
    const selectionCols = this.enableSelection() ? [SELECTION_COLUMN] : [];
    this.colDefsWithEdit = [...selectionCols, ...this.colDefs()];
    // Initialize column visibility defaults
    const vis: Record<string, boolean> = {};
    for (const c of this.colDefsWithEdit) if (c.field) vis[c.field] = true;
    this.colVisibility.set(vis);
    // Build TanStack columns
    this.tsColumns = this.colDefsWithEdit
      .filter((c) => !!c.field)
      .map((c) => ({
        id: c.field as string,
        header: c.headerName || (c.field as string),
        accessorFn: (row: any) => row?.[c.field as string],
        enableSorting: true,
      })) as TSColumnDef<any, any>[];
    this.tsTable = createTable({
      data: this.rows() as any[],
      columns: this.tsColumns,
      getCoreRowModel: getCoreRowModel(),
      getRowId: (row: any) => this.toId(row),
      state: {
        sorting: this.sorting(),
        columnVisibility: this.colVisibility(),
        rowSelection: this.buildRowSelectionForCurrentData(),
        // Provide defaults expected by some table features
        columnPinning: { left: [], right: [] },
      },
      initialState: {
        columnPinning: { left: [], right: [] },
      } as any,
      onStateChange: () => this.syncSignalsFromTable(),
      renderFallbackValue: null as any,
      onSortingChange: (updater: Updater<SortingState>) => {
        const next = typeof updater === 'function'
          ? updater(this.tsTable!.getState().sorting)
          : (updater as SortingState);
        this.sorting.set(next);
        const first = (next as any[])?.[0];
        this.sortCol.set(first?.id ?? null);
        this.sortDir.set(first?.desc ? 'desc' : first ? 'asc' : null);
        this.loadPage(0);
      },
      onRowSelectionChange: (updater: Updater<any>) => {
        const current: any = (this.tsTable!.getState() as any).rowSelection ?? {};
        const next: any = typeof updater === 'function' ? updater(current) : updater;
        const set = new Set(this.selectedIdSet());
        for (const row of this.rows()) {
          const id = this.toId(row);
          if (!id) continue;
          if (next[id]) set.add(id);
          else set.delete(id);
        }
        this.selectedIdSet.set(set);
        this.onSelectionChanged();
      },
    });
    await this.loadPage(0);
  }

  private syncSignalsFromTable() {
    const st: any = this.tsTable?.getState?.() ?? {};
    if (st.sorting) this.sorting.set(st.sorting);
    if (st.columnVisibility) this.colVisibility.set(st.columnVisibility);
    // Recompute pin offsets when pinning state changes
    this.updatePinOffsets();
  }

  /** Called when a row is hovered. Used to track row ID. */
  public onCellMouseOver(row: any) {
    this.lastRowHovered = row?.id;
  }

  /** Called when a cell changes. Persists changes via backend and manages undo. */
  public async onCellValueChanged(row: Partial<T> & { id: string }, field: keyof T) {
    const key = field;

    if (this.shouldBlockEdit(row, key)) {
      this.undoMgr.undo();
      return this.alertSvc.showError(this.config.messages.editBlocked);
    }

    const payload = createPayload(row, key);
    const edited = await this.applyEdit(row.id, payload);

    if (!edited) {
      this.undoMgr.undo();
      return this.alertSvc.showError(this.config.messages.editFailed);
    }

    this.undoMgr.updateSizes();
  }

  // AG Grid lifecycle removed

  /** Called when selection changes. Updates selected state. */
  public onSelectionChanged() {
    const count = this.getSelectedRows()?.length ?? 0;
    this.isRowSelected.set(count > 0);
    this.countRowSelected.set(count);
  }

  /** Opens edit form for row. */
  public openEdit(id: string) {
    return this.view(id);
  }

  /** Ensure visible rows are selected if part of global selection */
  public reapplySelectionToVisible() {
    // selection handled via signals
  }

  /** Cancels the fetch call and hides loader. */
  public sendAbort() {
    this.gridSvc.abort();
  }

  /** Trigger AG Grid filter recomputation */
  public triggerFilterChanged() {
    this.loadPage(0);
  }

  /** Navigates to view route for given ID or last hovered ID. */
  public view(id?: string) {
    return viewIfAllowed({
      id,
      lastRowHovered: this.lastRowHovered,
      disableView: this.disableView(),
      navigate: (path) => navigateIfValid(this.router, this.route, path),
    });
  }

  /** Navigates to add route. */
  protected add() {
    navigateIfValid(this.router, this.route, this.addRoute());
  }

  protected callCellRenderer(row: any, col: ColDef): string {
    const fn: any = (col as any).cellRenderer;
    if (typeof fn === 'function') {
      const value = this.hasValueFormatter(col) ? this.callValueFormatter(row, col) : this.getCellValue(row, col);
      return String(fn({ data: row, value, colDef: col }));
    }
    return '';
  }

  protected callValueFormatter(row: any, col: ColDef): any {
    const fn: any = (col as any).valueFormatter;
    if (typeof fn === 'function') {
      return fn({ data: row, value: this.getCellValue(row, col), colDef: col });
    }
    return this.getCellValue(row, col);
  }

  protected canMerge() {
    return this.countRowSelected() > 1;
  }

  protected canNext(): boolean {
    return this.pageIndex() + 1 < this.totalPages();
  }

  protected canPrev(): boolean {
    return this.pageIndex() > 0;
  }

  /** Clear both grid selection and the select-all cache */
  protected clearAllSelection() {
    this.allSelected.set(false);
    this.allSelectedIds = [];
    this.allSelectedIdSet = new Set();
    this.allSelectedCount = 0;
    this.isRowSelected.set(false);
    this.countRowSelected.set(0);
  }

  /** Warn about export scope, then export */
  protected async confirmExport(): Promise<void> {
    await doExportCsv({
      dialogs: this.dialogs,
      api: undefined as any,
      alertSvc: this.alertSvc,
      config: this.config,
      getRowsForExport: () => this.rows().map((r) => ({ ...r } as any)),
    });
  }

  /** Triggers the import CSV flow (placeholder only). */
  protected doImportCSV() {
    // Emit a simple signal so consumers can open their import UI
    this.importCSV.emit('open');
  }

  /** Actually performs export via AG Grid. */
  protected exportToCSV() {
    // Delegated to confirmExport -> doExportCsv
  }

  protected filter() {
    // Open right-side filter panel and seed with current filters
    const current = this.filterValues();
    const panel: Record<string, { op: 'contains' | 'equals'; value: any }> = {};
    for (const [k, v] of Object.entries(current)) {
      if (v && typeof v === 'object' && 'op' in (v as any) && 'value' in (v as any)) panel[k] = v as any;
      else panel[k] = { op: 'contains', value: v } as any;
    }
    this.panelFilters.set(panel);
    this.showFilterPanel.set(true);
  }

  // Helpers for template-safe access to dynamic fields/formatters/renderers
  protected getCellValue(row: any, col: ColDef): any {
    // Prefer valueGetter when provided
    const vget: any = (col as any)?.valueGetter;
    if (typeof vget === 'function') {
      try {
        return vget({ data: row, colDef: col, value: (row as any)?.[col.field as string] });
      } catch {
        // fall through to field lookup
      }
    }
    const field = (col.field as string) || '';
    return field ? (row as any)?.[field] : undefined;
  }

  protected hasValueFormatter(col: ColDef): boolean {
    return typeof (col as any)?.valueFormatter === 'function';
  }

  // Helper to derive filter select options from a column definition
  protected getFilterOptionsForCol(col: ColDef): string[] | null {
    const cep: any = (col as any)?.cellEditorParams;
    let cfg: any = null;
    if (!cep) return null;
    try {
      cfg = typeof cep === 'function' ? cep() : cep;
    } catch {
      cfg = null;
    }
    const vals = cfg?.values;
    return Array.isArray(vals) && vals.length ? (vals as string[]) : null;
  }

  /** Number of rows displayed on the current page */
  protected getDisplayedCount(): number {
    return this.rows().length;
  }

  // Filter panel actions
  protected panelFields(): string[] {
    return this.colDefsWithEdit.filter((c) => !!c.field).map((c) => c.field!) as string[];
  }

  protected panelLabelFor(field: string): string {
    const col = this.colDefsWithEdit.find((c) => c.field === field);
    return col?.headerName || field;
  }

  protected panelOptionsFor(field: string): string[] | null {
    const col = this.colDefsWithEdit.find((c) => c.field === field);
    if (!col) return null;
    return this.getFilterOptionsForCol(col);
  }

  protected onPanelOpChange(field: string, op: 'contains' | 'equals') {
    const next = { ...this.panelFilters() };
    const prev = next[field] || { op: 'contains', value: '' };
    next[field] = { ...prev, op };
    this.panelFilters.set(next);
  }

  protected onPanelValueChange(field: string, value: any) {
    const next = { ...this.panelFilters() };
    const prev = next[field] || { op: 'contains', value: '' };
    next[field] = { ...prev, value };
    this.panelFilters.set(next);
  }

  protected applyPanelFilters() {
    const raw = this.panelFilters();
    const cleaned: Record<string, any> = {};
    for (const [k, v] of Object.entries(raw)) {
      const sv = String((v as any)?.value ?? '').trim();
      if (!sv) continue;
      cleaned[k] = { op: (v as any)?.op ?? 'contains', value: sv };
    }
    this.filterValues.set(cleaned);
    this.showFilterPanel.set(false);
    this.loadPage(0);
  }

  protected clearPanelFilters() {
    this.panelFilters.set({});
  }

  protected closePanel() {
    this.showFilterPanel.set(false);
  }

  // Virtualization helpers
  protected onScroll(event: Event) {
    const el = event.target as HTMLElement;
    this.scrollTop.set(el.scrollTop || 0);
    this.viewportH.set(el.clientHeight || this.viewportH());
    this.virtualizer?.scrollToOffset?.(el.scrollTop || 0);
  }

  protected startIndex(): number {
    const items = this.virtualizer?.getVirtualItems() ?? [];
    if (items.length) return items[0].index;
    // Fallback before virtualizer initializes
    return Math.max(0, Math.floor((this.scrollTop() || 0) / this.rowHeight));
  }

  protected visibleCount(): number {
    const items = this.virtualizer?.getVirtualItems() ?? [];
    if (items.length) return items.length;
    const vp = this.viewportH() || 0;
    return Math.max(1, Math.ceil(vp / this.rowHeight) + 6);
  }

  protected endIndex(): number {
    const items = this.virtualizer?.getVirtualItems() ?? [];
    if (items.length) return items[items.length - 1].index + 1;
    return Math.min(this.rows().length, this.startIndex() + this.visibleCount());
  }

  protected topPadHeight(): number {
    const items = this.virtualizer?.getVirtualItems() ?? [];
    if (items.length) return items[0].start;
    return this.startIndex() * this.rowHeight;
  }

protected bottomPadHeight(): number {
    const v = this.virtualizer;
    if (v) {
      const items = v.getVirtualItems();
      const total = v.getTotalSize();
      const renderedEnd = items.length ? items[items.length - 1].end : 0;
      return Math.max(0, total - renderedEnd);
    }
    const total = this.rows().length * this.rowHeight;
    const rendered = this.topPadHeight() + (this.endIndex() - this.startIndex()) * this.rowHeight;
    return Math.max(0, total - rendered);
  }

  protected visibleRows(): Partial<T>[] {
    return this.rows().slice(this.startIndex(), this.endIndex());
  }

  // TanStack helpers
  protected leafHeaders(): any[] {
    const tbl: any = this.tsTable;
    if (!tbl) return [];
    // Flat headers correspond to leaf columns
    return (tbl.getFlatHeaders?.() || []).filter((h: any) => h.column?.getIsVisible?.());
  }

  protected headerGroups(): any[] {
    const tbl: any = this.tsTable;
    return tbl?.getHeaderGroups?.() || [];
  }

  protected visibleTableRows(): any[] {
    const tbl: any = this.tsTable;
    const all = tbl?.getRowModel?.().rows || [];
    const start = this.startIndex();
    const end = this.endIndex();
    return all.slice(start, end);
  }

  protected sortIndicatorForHeader(h: any): string {
    const s = typeof h?.column?.getIsSorted === 'function' ? h.column.getIsSorted() : undefined;
    if (s === 'asc') return '▲';
    if (s === 'desc') return '▼';
    return '';
  }

  protected ariaSortHeader(h: any): 'ascending' | 'descending' | 'none' {
    const s = typeof h?.column?.getIsSorted === 'function' ? h.column.getIsSorted() : undefined;
    if (s === 'asc') return 'ascending';
    if (s === 'desc') return 'descending';
    return 'none';
  }

  protected toggleHeaderSort(h: any, ev?: MouseEvent) {
    const fn = h?.column?.toggleSorting;
    if (typeof fn === 'function') fn.call(h.column, undefined, !!ev?.shiftKey);
  }

  protected getColDefById(id: string): ColDef | undefined {
    return this.colDefsWithEdit.find((c) => c.field === id);
  }

  protected getColWidth(id: string): number | null {
    return this.colWidths()[id] ?? null;
  }

  protected setColWidth(id: string, px: number) {
    const next = { ...this.colWidths() };
    next[id] = Math.max(40, Math.floor(px));
    this.colWidths.set(next);
    // After width change, recompute sticky offsets
    queueMicrotask(() => this.updateHeaderWidths());
  }

  protected getFieldFromHeader(h: any): string | null {
    const id = h?.column?.id;
    return typeof id === 'string' ? id : null;
  }

  // Column pinning helpers
  protected pinState(h: any): 'left' | 'right' | false {
    const fn = h?.column?.getIsPinned;
    return typeof fn === 'function' ? (fn.call(h.column) as any) : false;
  }

  protected cyclePin(h: any) {
    const current = this.pinState(h);
    const next = current === 'left' ? 'right' : current === 'right' ? false : 'left';
    const pin = h?.column?.pin;
    if (typeof pin === 'function') pin.call(h.column, next as any);
  }

  protected pinLeft(h: any) {
    const pin = h?.column?.pin;
    if (typeof pin === 'function') pin.call(h.column, 'left');
  }

  protected pinRight(h: any) {
    const pin = h?.column?.pin;
    if (typeof pin === 'function') pin.call(h.column, 'right');
  }

  protected unpin(h: any) {
    const pin = h?.column?.pin;
    if (typeof pin === 'function') pin.call(h.column, false);
  }

  // Header menu actions
  protected sortAsc(h: any) {
    const isSorted = typeof h?.column?.getIsSorted === 'function' ? h.column.getIsSorted() : undefined;
    if (isSorted !== 'asc') {
      const fn = h?.column?.toggleSorting;
      if (typeof fn === 'function') fn.call(h.column, false, false);
    }
  }

  protected sortDesc(h: any) {
    const isSorted = typeof h?.column?.getIsSorted === 'function' ? h.column.getIsSorted() : undefined;
    if (isSorted !== 'desc') {
      const fn = h?.column?.toggleSorting;
      if (typeof fn === 'function') fn.call(h.column, true, false);
    }
  }

  protected clearSort(h: any) {
    if (typeof h?.column?.clearSorting === 'function') {
      h.column.clearSorting();
      return;
    }
    // Fallback: remove from sorting state
    const id = this.getFieldFromHeader(h);
    if (!id) return;
    const next = (this.sorting() as any[]).filter((s) => s.id !== id);
    this.sorting.set(next);
    this.tsTable?.setOptions((prev: any) => ({ ...prev, state: { ...prev.state, sorting: next } }));
    this.loadPage(0);
  }

  protected hideColumn(h: any) {
    const id = this.getFieldFromHeader(h);
    if (!id) return;
    this.toggleCol(id, false);
    if (typeof h?.column?.toggleVisibility === 'function') h.column.toggleVisibility(false);
  }

  protected getFilterValue(field: string): string {
    const fv: any = this.filterValues()[field];
    if (fv && typeof fv === 'object' && 'value' in fv) return String(fv.value ?? '');
    return fv ? String(fv) : '';
  }

  protected onHeaderFilterInput(field: string, value: any) {
    const v = String(value ?? '').trim();
    const next = { ...this.filterValues() };
    if (!v) delete next[field];
    else next[field] = { op: 'contains', value: v } as any;
    this.filterValues.set(next);
    this.loadPage(0);
  }

  protected clearHeaderFilter(field: string) {
    const next = { ...this.filterValues() };
    delete next[field];
    this.filterValues.set(next);
    this.loadPage(0);
  }

  // Sticky pin offsets
  private headerWidthMap = new Map<string, number>();
  private pinnedLeftOffsets = signal<Record<string, number>>({});
  private pinnedRightOffsets = signal<Record<string, number>>({});

  protected leftOffsetPx(colId: string): number {
    return this.pinnedLeftOffsets()[colId] || 0;
  }

  protected rightOffsetPx(colId: string): number {
    return this.pinnedRightOffsets()[colId] || 0;
  }

  private updateHeaderWidths = () => {
    const table = this.gridTable?.nativeElement;
    if (!table) return;
    const nodes = table.querySelectorAll('thead th[data-col-id]');
    nodes.forEach((el) => {
      const id = (el as HTMLElement).getAttribute('data-col-id') || '';
      if (!id) return;
      const rect = (el as HTMLElement).getBoundingClientRect();
      if (rect.width > 0) this.headerWidthMap.set(id, rect.width);
    });
    this.updatePinOffsets();
  };

  private updatePinOffsets() {
    const tbl: any = this.tsTable;
    const pin = tbl?.getState?.().columnPinning || { left: [], right: [] };
    const leftIds: string[] = Array.isArray(pin.left) ? pin.left : [];
    const rightIds: string[] = Array.isArray(pin.right) ? pin.right : [];

    const left: Record<string, number> = {};
    let acc = 0;
    for (const id of leftIds) {
      left[id] = acc;
      acc += this.headerWidthMap.get(id) || 0;
    }
    const right: Record<string, number> = {};
    let racc = 0;
    for (let i = rightIds.length - 1; i >= 0; i--) {
      const id = rightIds[i];
      right[id] = racc;
      racc += this.headerWidthMap.get(id) || 0;
    }
    this.pinnedLeftOffsets.set(left);
    this.pinnedRightOffsets.set(right);
  }

  // Column visibility bulk actions
  protected showAllCols() {
    const v = { ...this.colVisibility() };
    for (const c of this.colDefsWithEdit) if (c.field) v[c.field] = true;
    this.colVisibility.set(v);
    if (this.tsTable) this.tsTable.setOptions((prev: any) => ({ ...prev, state: { ...prev.state, columnVisibility: v } }));
  }

  protected hideAllCols() {
    const v = { ...this.colVisibility() };
    for (const c of this.colDefsWithEdit) if (c.field) v[c.field] = false;
    this.colVisibility.set(v);
    if (this.tsTable) this.tsTable.setOptions((prev: any) => ({ ...prev, state: { ...prev.state, columnVisibility: v } }));
  }

  // Auto-size column based on header and currently visible cells
  protected autoSizeColumn(h: any) {
    const id = this.getFieldFromHeader(h);
    if (!id) return;
    const table = this.gridTable?.nativeElement;
    if (!table) return;
    let max = 0;
    const head = table.querySelector(`thead th[data-col-id="${id}"]`) as HTMLElement | null;
    if (head) max = Math.max(max, head.scrollWidth + 16);
    const cells = table.querySelectorAll(`tbody td[data-col-id="${id}"]`);
    cells.forEach((el) => {
      const w = (el as HTMLElement).scrollWidth + 16;
      if (w > max) max = w;
    });
    if (max > 0) this.setColWidth(id, max);
  }

  protected hasCellRenderer(col: ColDef): boolean {
    return !!(col as any)?.cellRenderer;
  }

  

  /** Whether the current page (displayed rows) is fully selected */
  protected isPageFullySelected(): boolean {
    if (this.allSelected()) return false; // already globally selected

    const rowsOnCurrentPage = this.getDisplayedCount();
    if (rowsOnCurrentPage === 0) return false;

    const selectedOnPage = this.getSelectedRows()?.length ?? 0;
    return selectedOnPage > 0 && selectedOnPage === rowsOnCurrentPage;
  }

  protected isRowChecked(id: string): boolean {
    return this.allSelected() ? this.allSelectedIdSet.has(id) : this.selectedIdSet().has(id);
  }

  /** Utility: sets ID for each row (keep it stringy for stability) */
  // no-op (AG Grid only)

  // Theme no-op (AG Grid removed)

  // Sorting
  protected isSortable(col: ColDef): boolean {
    return !!col.field; // simple toggle; extend as needed
  }

  protected merge() {
    console.log('merged');
  }

  protected async nextPage() {
    if (!this.canNext()) return;
    await this.loadPage(this.pageIndex() + 1);
  }

  /** Called when row is double-clicked. */
  protected openEditOnDoubleClick(row: any) {
    this.openEdit(row?.id);
  }

  /** Bridge for column-level double-click handlers */
  protected handleCellDblClick(row: any, col: ColDef) {
    if (typeof (col as any).onCellDoubleClicked === 'function') {
      (col as any).onCellDoubleClicked({ data: row, colDef: col });
    } else {
      this.openEditOnDoubleClick(row);
    }
  }

  protected async prevPage() {
    if (!this.canPrev()) return;
    await this.loadPage(this.pageIndex() - 1);
  }

  /** Triggers a full grid refresh via backend. */
  protected async refresh(): Promise<void> {
    await this.loadPage(this.pageIndex());
  }

  /** Select all rows that match current search/tags (server- or client-side). */
  protected async selectAllMatching() {
    try {
      const options: any = {
        searchStr: this.searchSvc.getFilterText(),
        tags: this.limitToTags(),
      };
      const { rows, count } = this.archiveMode()
        ? await (this.gridSvc as any).getAllArchived(options)
        : await this.gridSvc.getAll(options);
      const ids = (rows ?? []).map((r: any) => String(r.id)).filter(Boolean);
      this.allSelectedIds = ids;
      this.allSelectedIdSet = new Set(ids);
      this.allSelectedCount = count ?? ids.length;
      this.allSelected.set(ids.length > 0);
      this.isRowSelected.set(ids.length > 0);
      this.countRowSelected.set(this.allSelectedCount);
      // Reflect selection in the grid for currently rendered rows
      this.reapplySelectionToVisible();
      this.alertSvc.showInfo(`Selected ${this.allSelectedCount} row(s)`);
    } catch (e) {
      this.alertSvc.showError('Failed to select all rows');
    }
  }

  protected sortIndicator(col: ColDef): string {
    if (!col.field) return '';
    if (this.sortCol() !== col.field) return '';
    return this.sortDir() === 'asc' ? '▲' : this.sortDir() === 'desc' ? '▼' : '';
  }

  protected ariaSort(col: ColDef): 'ascending' | 'descending' | 'none' {
    if (!col.field || this.sortCol() !== col.field) return 'none';
    return this.sortDir() === 'desc' ? 'descending' : 'ascending';
  }

  protected toId(row: any): string {
    const id = (row as any)?.id;
    return id == null ? '' : String(id);
  }

  /** Toggle archive mode and refresh/filter accordingly */
  protected toggleArchiveMode() {
    this.archiveMode.set(!this.archiveMode());
    // Clear any prior selection context when switching datasets
    this.clearAllSelection();
    // Reload first page
    this.loadPage(0);
  }

  protected togglePageChecked(checked: boolean) {
    if (this.allSelected()) this.allSelected.set(false);
    const set = new Set<string>(this.selectedIdSet());
    if (checked) {
      for (const r of this.rows()) {
        const id = String((r as any)?.id ?? '');
        if (id) set.add(id);
      }
    } else {
      for (const r of this.rows()) {
        const id = String((r as any)?.id ?? '');
        if (id) set.delete(id);
      }
    }
    this.selectedIdSet.set(set);
    this.onSelectionChanged();
  }

  protected toggleRowChecked(id: string, checked: boolean) {
    if (this.allSelected()) {
      if (!checked) this.allSelectedIdSet.delete(id);
      else this.allSelectedIdSet.add(id);
    } else {
      const set = new Set(this.selectedIdSet());
      if (checked) set.add(id);
      else set.delete(id);
      this.selectedIdSet.set(set);
    }
    this.onSelectionChanged();
  }

  // Pagination
  protected totalPages(): number {
    const size = this.config.pageSize || 1;
    return Math.max(1, Math.ceil((this.totalCountAll || 0) / size));
  }

  /** Helper: applies single-field patch */
  private async applyEdit(id: string, data: Partial<T>): Promise<boolean> {
    return this.gridSvc
      .update(id, data as U)
      .then(() => true)
      .catch(() => false);
  }

  private async loadPage(index: number) {
    const end = this._loading.begin();
    try {
      const pageSize = this.config.pageSize;
      const startRow = index * pageSize;
      const endRow = startRow + pageSize;
      const sortState = this.sorting();
      const options: any = {
        searchStr: this.searchSvc.getFilterText(),
        startRow,
        endRow,
        tags: this.limitToTags(),
        filterModel: this.buildFilterModel(),
        sortModel: (sortState && (sortState as any[]).length)
          ? (sortState as any[]).map((s: any) => ({ colId: s.id, sort: s.desc ? 'desc' : 'asc' }))
          : (this.sortCol() && this.sortDir())
            ? [{ colId: this.sortCol(), sort: this.sortDir() }]
            : [],
      } as Partial<getAllOptionsType>;
      const data = this.archiveMode()
        ? await (this.gridSvc as any).getAllArchived(options)
        : await this.gridSvc.getAll(options as any);
      this.rows.set((data.rows as Partial<T>[]) ?? []);
      // Update virtualizer and table data
      if (this.virtualizer) {
        this.virtualizer.setOptions({
          ...this.virtualizer.options,
          count: this.rows().length,
        });
      }
      if (this.tsTable) {
        this.tsTable.setOptions((prev: any) => ({
          ...prev,
          data: this.rows() as any[],
          state: {
            ...prev.state,
            rowSelection: this.buildRowSelectionForCurrentData(),
            sorting: this.sortCol() && this.sortDir() ? [{ id: this.sortCol()!, desc: this.sortDir() === 'desc' }] : [],
          },
        }));
      }
      this.totalCountAll = data.count ?? this.rows().length;
      this.pageIndex.set(index);
    } catch (e) {
      this.alertSvc.showError(this.config.messages.loadFailed);
    } finally {
      end();
    }
  }

  /** Helper: prevents editing specific fields */
  private shouldBlockEdit(row: Partial<T>, key: keyof T): boolean {
    return 'deletable' in row && (row as any).deletable === false && (key as string) === 'name';
  }

  // Build a compact filter model from current UI filter values
  protected buildFilterModel(): Record<string, any> {
    const raw = this.filterValues();
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(raw)) {
      if (v === undefined || v === null) continue;
      if (typeof v === 'object' && v && 'value' in (v as any)) {
        const op = ((v as any).op as any) ?? 'contains';
        const sv = String((v as any).value ?? '').trim();
        if (!sv) continue;
        out[k] = { type: 'text', op, value: sv };
      } else {
        const sv = String(v).trim();
        if (!sv) continue;
        out[k] = { type: 'text', op: 'contains', value: sv };
      }
    }
    return out;
  }

  // Handle filter input changes
  protected onFilterInput(field: string, value: any) {
    const next = { ...this.filterValues() };
    if (value === undefined || value === null || String(value).trim() === '') delete next[field];
    else next[field] = value;
    this.filterValues.set(next);
    this.loadPage(0);
  }

  protected headerClick(col: ColDef, ev?: MouseEvent) {
    if (!this.isSortable(col) || !col.field) return;
    const id = col.field as string;
    const multi = !!ev?.shiftKey;
    const colObj = (this.tsTable as any)?.getColumn?.(id);
    if (colObj?.toggleSorting) {
      colObj.toggleSorting(undefined, multi);
      return;
    }
    // Fallback: minimal multi-sort
    const current = [...this.sorting()];
    let next = multi ? current : [];
    const idx = next.findIndex((s) => s.id === id);
    if (idx === -1) next.push({ id, desc: false } as any);
    else if (!next[idx].desc) next[idx] = { id, desc: true } as any;
    else next.splice(idx, 1);
    this.sorting.set(next);
    this.loadPage(0);
  }

  protected isColVisible(c: ColDef): boolean {
    const v = this.colVisibility();
    if (!c.field) return true;
    return v[c.field] !== false;
  }

  protected toggleCol(field: string, checked: boolean) {
    const v = { ...this.colVisibility() };
    v[field] = checked;
    this.colVisibility.set(v);
    if (this.tsTable) {
      this.tsTable.setOptions((prev: any) => ({
        ...prev,
        state: { ...prev.state, columnVisibility: v },
      }));
    }
  }

  // Build TanStack rowSelection snapshot for current data from our global selected set
  private buildRowSelectionForCurrentData(): Record<string, boolean> {
    const ids = this.selectedIdSet();
    const map: Record<string, boolean> = {};
    for (const r of this.rows()) {
      const id = this.toId(r);
      if (id && ids.has(id)) map[id] = true;
    }
    return map;
  }
}
