import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  effect,
  inject,
  input,
  output,
  signal,
  computed,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { getAllOptionsType } from '@common';
import { Icon } from '@icons/icon';
import { PcIconNameType } from '@icons/icons.index';
import { AbstractAPIService } from '@services/api/abstract-api.service';
import { SearchService } from '@services/api/search-service';
import { ConfirmDialogService } from '@services/shared-dialog.service';
import {
  type SortingState,
  ColumnDef as TSColumnDef,
  type Updater,
} from '@tanstack/table-core';
import { Virtualizer, elementScroll, observeElementOffset, observeElementRect } from '@tanstack/virtual-core';
import { AlertService } from '@uxcommon/components/alerts/alert-service';
import { createLoadingGate } from '@uxcommon/loading-gate';

import { confirmDeleteAndRun, doExportCsv } from './datagrid.actions';
// AG Grid callbacks/datasource removed in TanStack swap
import { navigateIfValid, viewIfAllowed } from './datagrid.nav';
import { DATA_GRID_CONFIG, DEFAULT_DATA_GRID_CONFIG, type DataGridConfig } from './datagrid.tokens';
import { createPayload } from './datagrid.utils';
import {
  buildFilterModel as _buildFilterModel,
  getFilterOptionsForCol as _getFilterOptionsForCol,
  getFilterArray as _getFilterArray,
  getFilterValue as _getFilterValue,
  inlineFilterLabel as _inlineFilterLabel,
  preparePanelFilters,
} from './datagrid-filters';
import { computeAutoSizeWidth, computePinOffsets, measureHeaderWidths } from './datagrid-columns';
import { isPageFullySelected, togglePageSelectionSet, updateAllSelectedIdSet } from './datagrid-selection';
import { buildGetAllOptions, computeTotalPages, makePersistState, parsePersistState } from './datagrid-data';
import { setTableData, updateTableWindow as applyTableWindow, createGridTable, buildTsColumns } from './datagrid-table';
type RowOf<K extends keyof Models> = Models[K];
import { type ColumnDef as ColDef, SELECTION_COLUMN, defaultGridOptions } from './grid-defaults';
import { GridActionComponent } from './tool-button';
import { UndoManager } from './undo-redo-mgr';
import { Models } from 'common/src/lib/kysely.models';

@Component({
  selector: 'pc-datagrid',
  imports: [Icon, GridActionComponent, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './datagrid.html',
})
export class DataGrid<T extends keyof Models, U> implements OnInit, AfterViewInit, OnDestroy {
  private readonly config = inject<DataGridConfig>(DATA_GRID_CONFIG, { optional: true }) ?? DEFAULT_DATA_GRID_CONFIG;
  private readonly dialogs = inject(ConfirmDialogService);
  private readonly route = inject(ActivatedRoute);
  private readonly searchSvc = inject(SearchService);

  private _colStartW = 0;

  // Manual fallback for column resizing when core handler isn't available
  private _colStartX = 0;

  //private readonly themeSvc = inject(ThemeService);
  private _loading = createLoadingGate();

  // Persistence
  private _persistKey = 'pcdg';
  private _selStartW = 48;
  private _selStartX = 0;
  private dragColId: string | null = null;
  private fetchingNext = false;
  @ViewChild('gridTable', { static: false }) private gridTable?: ElementRef<HTMLTableElement>;

  // Sticky pin offsets
  private headerWidthMap = new Map<string, number>();

  // Other State
  private lastRowHovered: string | undefined;
  private oldFilterText = '';
  private pinnedLeftOffsets = signal<Record<string, number>>({});
  private pinnedRightOffsets = signal<Record<string, number>>({});

  // Optional cache placeholder removed (unused in current implementation)
  @ViewChild('scroller', { static: false }) private scroller?: ElementRef<HTMLDivElement>;
  private tsColumns: TSColumnDef<any, any>[] = [];
  private tsTable: any;
  private updateHeaderWidths = () => {
    const table = this.gridTable?.nativeElement;
    if (!table) return;
    const measured = measureHeaderWidths(table);
    if (measured.selectionWidth != null) this.selectionStickyWidth.set(measured.selectionWidth);
    this.headerWidthMap = measured.headerMap;
    this.updatePinOffsets();
  };
  private virtualizer: Virtualizer<HTMLDivElement, Element> | undefined;

  // Injected Services
  protected readonly alertSvc = inject(AlertService);
  protected readonly countRowSelected = computed(() =>
    this.allSelected() ? this.allSelectedCount : this.selectedIdSet().size,
  );
  protected readonly gridSvc = inject<AbstractAPIService<T, U>>(AbstractAPIService);

  // State & UI Signals
  // Removed isRowSelected in favor of hasSelection computed
  protected readonly router = inject(Router);
  protected readonly undoMgr = new UndoManager();

  // Select-all-across-results state
  protected allSelected = signal(false);
  protected allSelectedCount = 0;
  protected allSelectedIdSet: Set<string> = new Set();
  protected allSelectedIds: string[] = [];
  protected archiveMode = signal(false);
  protected colDefsWithEdit: ColDef[] = [SELECTION_COLUMN];
  protected colVisibility = signal<Record<string, boolean>>({});
  protected colWidths = signal<Record<string, number>>({});

  // Inline edit state
  protected editingCell = signal<{ id: string; field: string } | null>(null);
  protected editingValue = signal<any>('');
  protected filterValues = signal<Record<string, any>>({});
  protected isLoading = this._loading.visible;
  protected mergedGridOptions: any = {};
  protected pageIndex = signal(0);
  protected panelFilters = signal<Record<string, { op: 'contains' | 'equals'; value: any }>>({});
  protected rowHeight = 36;

  // Table state (TanStack-like minimal state)
  protected rows = signal<Partial<RowOf<T>>[]>([]);
  protected scrollTop = signal(0);
  protected selectedIdSet = signal<Set<string>>(new Set());
  protected selectionStickyWidth = signal<number>(48);
  protected showFilterPanel = signal(false);
  protected showFilters = signal(false);
  protected sortCol = signal<string | null>(null);
  protected sortDir = signal<'asc' | 'desc' | null>(null);
  protected sorting = signal<SortingState>([]);
  protected suppressHeaderDrag = false;
  protected totalCountAll = 0;
  protected viewportH = signal(0);
  // Computed derivations
  protected readonly totalPages = computed(() => computeTotalPages(this.totalCountAll, this.config.pageSize));
  protected readonly canNext = computed(() => this.pageIndex() + 1 < this.totalPages());
  protected readonly canPrev = computed(() => this.pageIndex() > 0);
  protected readonly displayedCount = computed(() => this.rows().length);
  protected readonly selectedOnPageCount = computed(() => {
    if (this.allSelected()) return 0;
    const set = this.selectedIdSet();
    let cnt = 0;
    for (const r of this.rows()) {
      const id = this.toId(r);
      if (id && set.has(id)) cnt++;
    }
    return cnt;
  });
  protected readonly isPageFullySelected = computed(() =>
    isPageFullySelected(this.allSelected(), this.displayedCount(), this.selectedOnPageCount()),
  );
  protected readonly hasSelection = computed(() =>
    this.allSelected() ? this.allSelectedCount > 0 : this.selectedIdSet().size > 0,
  );

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
  public storageKey = input<string>('');

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
    // Persist key table-related states whenever they change
    effect(() => {
      // dependencies
      this.sorting();
      this.colVisibility();
      this.filterValues();
      this.selectionStickyWidth();
      this.saveState();
    });
    // Update table data when rows or sort change
    effect(() => {
      const rows = this.rows();
      this.sortCol();
      this.sortDir();
      setTableData(
        this.tsTable,
        rows as any[],
        this.buildRowSelectionForCurrentData(),
        this.sortCol(),
        this.sortDir(),
      );
    });
    // Keep virtualizer count in sync with rows length
    effect(() => {
      const count = this.rows().length;
      if (this.virtualizer) this.virtualizer.setOptions({ ...this.virtualizer.options, count });
    });
    // Recompute pin offsets on column width or selection width changes
    effect(() => {
      this.colWidths();
      this.selectionStickyWidth();
      this.updatePinOffsets();
    });
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
      sortModel: this.sorting().map((s) => ({ colId: s.id, sort: s.desc ? 'desc' : 'asc' })),
      filterModel: this.buildFilterModel(),
      tags: this.limitToTags(),
    } as getAllOptionsType;
  }

  /** Utility: returns selected rows from grid */
  public getSelectedRows() {
    if (this.allSelected()) {
      return this.allSelectedIds.map((id) => ({ id })) as unknown as (Partial<RowOf<T>> & { id: string })[];
    }
    const ids = this.selectedIdSet();
    return Array.from(ids).map((id) => ({ id })) as unknown as (Partial<RowOf<T>> & { id: string })[];
  }

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
    try {
      this.gridSvc.abort();
    } catch {}
    this.virtualizer = undefined;
    this.tsTable = undefined;
    window.removeEventListener('resize', this.updateHeaderWidths);
  }

  public async ngOnInit() {
    // Initialize persistence key
    const urlKey = typeof window !== 'undefined' ? window.location?.pathname || '' : '';
    this._persistKey = this.storageKey() ? this.storageKey()! : `pcdg:${urlKey}`;
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
    this.tsColumns = buildTsColumns(this.colDefsWithEdit);
    this.tsTable = createGridTable({
      rows: this.rows(),
      columns: this.tsColumns,
      getRowId: (row: any) => this.toId(row),
      state: {
        sorting: this.sorting(),
        columnVisibility: this.colVisibility(),
        rowSelection: this.buildRowSelectionForCurrentData(),
        columnPinning: { left: [], right: [] },
        columnSizing: {},
      },
      onStateChange: () => this.syncSignalsFromTable(),
      onSortingChange: (updater: Updater<SortingState>) => {
        const next = typeof updater === 'function' ? updater(this.tsTable!.getState().sorting) : updater;
        this.sorting.set(next);
        const first = next?.[0];
        this.sortCol.set(first?.id ?? null);
        this.sortDir.set(first?.desc ? 'desc' : first ? 'asc' : null);
        this.loadPage(0);
        this.saveState();
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
      onColumnSizingChange: (updater: Updater<Record<string, number>>) => {
        const current = (this.tsTable!.getState() as any).columnSizing || {};
        const next = typeof updater === 'function' ? (updater as any)(current) : (updater as any);
        this.colWidths.set({ ...(next || {}) });
        this.tsTable!.setOptions((prev: any) => ({ ...prev, state: { ...prev.state, columnSizing: next || {} } }));
        queueMicrotask(() => this.updatePinOffsets());
        this.saveState();
      },
    });
    // Load persisted state and apply to table before first load
    this.loadState();
    await this.loadPage(0);
  }

  /** Called when a row is hovered. Used to track row ID. */
  public onCellMouseOver(row: any) {
    this.lastRowHovered = row?.id;
  }

  /** Called when a cell changes. Persists changes via backend and manages undo. */
  public async onCellValueChanged(row: Partial<RowOf<T>> & { id: string }, field: any) {
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
  public onSelectionChanged() {}

  /** Opens edit form for row. */
  public openEdit(id: string) {
    return this.view(id);
  }

  // reapplySelectionToVisible removed (selection handled via signals)

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

  protected ariaSort(col: ColDef): 'ascending' | 'descending' | 'none' {
    if (!col.field || this.sortCol() !== col.field) return 'none';
    return this.sortDir() === 'desc' ? 'descending' : 'ascending';
  }

  protected ariaSortHeader(h: any): 'ascending' | 'descending' | 'none' {
    const s = typeof h?.column?.getIsSorted === 'function' ? h.column.getIsSorted() : undefined;
    if (s === 'asc') return 'ascending';
    if (s === 'desc') return 'descending';
    return 'none';
  }

  // Auto-size column based on header and currently visible cells
  protected autoSizeColumn(h: any) {
    const id = this.getFieldFromHeader(h);
    if (!id) return;
    const table = this.gridTable?.nativeElement;
    if (!table) return;
    const px = computeAutoSizeWidth(table, id);
    if (px > 0) this.setColWidth(id, px);
    this.saveState();
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

  // Build a compact filter model from current UI filter values
  protected buildFilterModel(): Record<string, any> {
    return _buildFilterModel(this.filterValues());
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

  protected readonly canMerge = computed(() => this.countRowSelected() > 1);

  // canNext/canPrev are computed

  protected cancelEdit() {
    this.editingCell.set(null);
  }

  /** Clear both grid selection and the select-all cache */
  protected clearAllSelection() {
    this.allSelected.set(false);
    this.allSelectedIds = [];
    this.allSelectedIdSet = new Set();
    this.allSelectedCount = 0;
  }

  protected clearHeaderFilter(field: string) {
    const next = { ...this.filterValues() };
    delete next[field];
    this.filterValues.set(next);
    this.loadPage(0);
    this.saveState();
  }

  protected clearPanelFilters() {
    this.panelFilters.set({});
  }

  protected clearSort(h: any) {
    if (typeof h?.column?.clearSorting === 'function') {
      h.column.clearSorting();
      return;
    }
    // Fallback: remove from sorting state
    const id = this.getFieldFromHeader(h);
    if (!id) return;
    const next = this.sorting().filter((s) => s.id !== id);
    this.sorting.set(next);
    this.tsTable?.setOptions((prev: any) => ({ ...prev, state: { ...prev.state, sorting: next } }));
    this.loadPage(0);
  }

  protected closePanel() {
    this.showFilterPanel.set(false);
  }

  protected columnLabelFor(id: string): string {
    const c = this.colDefsWithEdit.find((x) => x.field === id);
    return c?.headerName || id;
  }

  protected async commitEdit(row: any, col: ColDef) {
    if (!col.field) return;
    const id = this.toId(row);
    const value = this.coerceEditingValue(col, this.editingValue());
    const key = col.field as string;
    const prev = (row as any)[key as any];
    // Skip saving if value hasn't changed
    const equal = prev === value || (prev == null && (value == null || value === ''));
    if (equal) {
      this.editingCell.set(null);
      return;
    }
    // Apply value locally to row copy (optimistic)
    const before = { ...(row || {}) } as any;
    (row as any)[key as any] = value;
    try {
      // Pass the full row so payload includes the edited value
      await this.onCellValueChanged(row as any, col.field as any);
      this.updateEditedRowInCaches(id, col.field, value);
      this.alertSvc.showSuccess('Row updated');
    } catch {
      // revert local row on failure
      (row as any)[key as any] = before[key as any];
      this.alertSvc.showError('Update failed');
    } finally {
      this.editingCell.set(null);
      // Refresh visible window in table
      this.updateTableWindow(this.startIndex(), this.endIndex());
    }
  }

  /** Warn about export scope, then export */
  protected async confirmExport(): Promise<void> {
    await doExportCsv({
      dialogs: this.dialogs,
      alertSvc: this.alertSvc,
      config: this.config,
      getRowsForExport: () => this.rows().map((r) => ({ ...r })),
    });
  }

  protected cyclePin(h: any) {
    const current = this.pinState(h);
    const next = current === 'left' ? 'right' : current === 'right' ? false : 'left';
    const pin = h?.column?.pin;
    if (typeof pin === 'function') pin.call(h.column, next as any);
    this.saveState();
  }

  /** Triggers the import CSV flow (placeholder only). */
  protected doImportCSV() {
    // Emit a simple signal so consumers can open their import UI
    this.importCSV.emit('open');
  }

  protected endIndex(): number {
    const items = this.virtualizer?.getVirtualItems() ?? [];
    if (items.length) return items[items.length - 1].index + 1;
    return Math.min(this.rows().length, this.startIndex() + this.visibleCount());
  }

  // exportToCSV removed (legacy AG Grid path)

  protected filter() {
    // Open right-side filter panel and seed with current filters
    const current = this.filterValues();
    this.panelFilters.set(preparePanelFilters(current));
    this.showFilterPanel.set(true);
  }

  // Helpers for template-safe access to dynamic fields/formatters/renderers
  protected getCellValue(row: any, col: ColDef): any {
    // Prefer valueGetter when provided
    const vget = col.valueGetter as ((p: any) => any) | undefined;
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

  protected getColDefById(id: string): ColDef | undefined {
    return this.colDefsWithEdit.find((c) => c.field === id);
  }

  protected getColWidth(id: string): number | null {
    const col = this.tsTable?.getColumn?.(id);
    const size = typeof col?.getSize === 'function' ? Number(col.getSize()) : undefined;
    if (size && size > 0) return size;
    return this.colWidths()[id] ?? null;
  }

  // displayedCount is computed

  protected getFieldFromHeader(h: any): string | null {
    const id = h?.column?.id;
    return typeof id === 'string' ? id : null;
  }

  protected getFilterArray(field: string): string[] {
    return _getFilterArray(this.filterValues(), field);
  }

  // Helper to derive filter select options from a column definition
  protected getFilterOptionsForCol(col: ColDef): string[] | null {
    return _getFilterOptionsForCol(col);
  }

  protected getFilterValue(field: string): string {
    return _getFilterValue(this.filterValues(), field);
  }

  /** Bridge for column-level double-click handlers */
  protected handleCellDblClick(row: any, col: ColDef) {
    if (this.isEditable(col)) {
      this.startEdit(row, col);
      return;
    }
    if (typeof col.onCellDoubleClicked === 'function') {
      col.onCellDoubleClicked({ data: row, colDef: col });
    } else {
      this.openEditOnDoubleClick(row);
    }
  }

  protected hasCellRenderer(col: ColDef): boolean {
    return !!col.cellRenderer;
  }

  protected hasValueFormatter(col: ColDef): boolean {
    return typeof col.valueFormatter === 'function';
  }

  protected headerClick(col: ColDef, ev?: MouseEvent) {
    if (!this.isSortable(col) || !col.field) return;
    const id = col.field as string;
    const multi = !!ev?.shiftKey;
    const colObj = this.tsTable?.getColumn?.(id);
    if (colObj?.toggleSorting) {
      colObj.toggleSorting(undefined, multi);
      return;
    }
    // Fallback: minimal multi-sort
    const current = [...this.sorting()];
    let next: SortingState = multi ? current : [];
    const idx = next.findIndex((s) => s.id === id);
    if (idx === -1) next.push({ id, desc: false });
    else if (!next[idx].desc) next[idx] = { id, desc: true };
    else next.splice(idx, 1);
    this.sorting.set(next);
    this.loadPage(0);
  }

  protected headerGroups(): any[] {
    const tbl: any = this.tsTable;
    return tbl?.getHeaderGroups?.() || [];
  }

  // Hidden columns list for header menu as a computed
  protected readonly hiddenColumns = computed(() => {
    const v = this.colVisibility();
    return this.colDefsWithEdit.map((c) => c.field as string).filter((f) => !!f && v[f] === false) as string[];
  });

  protected hideAllCols() {
    const v = { ...this.colVisibility() };
    for (const c of this.colDefsWithEdit) if (c.field) v[c.field] = false;
    this.colVisibility.set(v);
    if (this.tsTable)
      this.tsTable.setOptions((prev: any) => ({ ...prev, state: { ...prev.state, columnVisibility: v } }));
  }

  protected hideColumn(h: any) {
    const id = this.getFieldFromHeader(h);
    if (!id) return;
    this.toggleCol(id, false);
    if (typeof h?.column?.toggleVisibility === 'function') h.column.toggleVisibility(false);
  }

  // Inline filter row helpers for multi-select label
  protected inlineFilterLabel(field: string): string {
    return _inlineFilterLabel(this.filterValues(), field);
  }

  protected inputTypeFor(col: ColDef): 'text' | 'number' | 'date' {
    const t = String(col?.cellDataType || '').toLowerCase();
    if (t === 'number' || t === 'numeric') return 'number';
    if (t === 'date' || t === 'datetime' || t === 'dateonly') return 'date';
    return 'text';
  }

  protected isColVisible(c: ColDef): boolean {
    const v = this.colVisibility();
    if (!c.field) return true;
    return v[c.field] !== false;
  }

  // Inline edit helpers
  protected isEditable(col: ColDef): boolean {
    return !!col?.editable;
  }

  protected isOptionChecked(field: string, option: string): boolean {
    return this.getFilterArray(field).includes(option);
  }

  /** Whether the current page (displayed rows) is fully selected */
  // isPageFullySelected is computed

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

  // TanStack helpers
  protected leafHeaders(): any[] {
    const tbl: any = this.tsTable;
    if (!tbl) return [];
    // Flat headers correspond to leaf columns
    return (tbl.getFlatHeaders?.() || []).filter((h: any) => h.column?.getIsVisible?.());
  }

  protected leftOffsetPx(colId: string): number {
    return this.pinnedLeftOffsets()[colId] || 0;
  }

  protected merge() {
    console.log('merged');
  }

  protected async nextPage() {
    if (!this.canNext()) return;
    await this.loadPage(this.pageIndex() + 1, true);
  }

  // Keyboard navigation between cells
  protected onCellKeydown(ev: KeyboardEvent) {
    const td = (ev.target as HTMLElement).closest('td') as HTMLElement | null;
    if (!td) return;
    const tr = td.parentElement as HTMLElement | null;
    if (!tr) return;
    const colId = td.getAttribute('data-col-id') || '';
    if (!colId) return;
    const key = ev.key;
    if (key === 'Enter') {
      ev.preventDefault();
      const rowId = tr.getAttribute('data-row-id') || '';
      if (!rowId) return;
      const col = this.getColDefById(colId);
      if (!col) return;
      // Find row by id from current window or full rows
      const row = (this.rows() as any[]).find((r: any) => String(r?.id) === rowId);
      if (!row) return;
      if (this.isEditable(col)) this.startEdit(row, col);
      return;
    }
    if (key !== 'ArrowDown' && key !== 'ArrowUp' && key !== 'ArrowLeft' && key !== 'ArrowRight') return;
    ev.preventDefault();
    if (key === 'ArrowDown' || key === 'ArrowUp') {
      const dir = key === 'ArrowDown' ? 1 : -1;
      let row: HTMLElement | null = tr;
      while (row) {
        row =
          dir > 0 ? (row.nextElementSibling as HTMLElement | null) : (row.previousElementSibling as HTMLElement | null);
        if (!row) break;
        const nextTd = row.querySelector(`td[data-col-id="${colId}"]`) as HTMLElement | null;
        if (nextTd) {
          nextTd.focus({ preventScroll: false });
          break;
        }
      }
    } else {
      // Left/Right within row
      const cells = Array.from(tr.querySelectorAll('td')) as HTMLElement[];
      const idx = cells.findIndex((c) => c === td);
      const nextIdx = key === 'ArrowRight' ? idx + 1 : idx - 1;
      const nextTd = cells[nextIdx];
      if (nextTd) nextTd.focus({ preventScroll: false });
    }
  }

  // Handle filter input changes
  protected onFilterInput(field: string, value: any) {
    const next = { ...this.filterValues() };
    if (value === undefined || value === null || String(value).trim() === '') delete next[field];
    else next[field] = value;
    this.filterValues.set(next);
    this.loadPage(0);
  }

  protected onHeaderCheckbox(checked: boolean) {
    if (this.allSelected()) this.allSelected.set(false);
    const api: any = this.tsTable;
    if (typeof api?.toggleAllRowsSelected === 'function') api.toggleAllRowsSelected(checked);
  }

  protected onHeaderDragOver(_h: any, ev: DragEvent) {
    ev.preventDefault();
    try {
      ev.dataTransfer!.dropEffect = 'move';
    } catch {}
  }

  // Column reordering (drag-and-drop)
  protected onHeaderDragStart(h: any, ev: DragEvent) {
    // If a resize gesture initiated, cancel drag reorder
    if (this.suppressHeaderDrag) {
      try {
        ev.preventDefault();
      } catch {}
      ev.stopPropagation();
      return;
    }
    const id = String(h?.column?.id || '');
    this.dragColId = id;
    try {
      ev.dataTransfer?.setData('text/plain', id);
      ev.dataTransfer!.effectAllowed = 'move';
    } catch {}
  }

  protected onHeaderDrop(h: any, ev: DragEvent) {
    ev.preventDefault();
    const src = ev.dataTransfer?.getData('text/plain') || this.dragColId;
    const tgt = String(h?.column?.id || '');
    if (!src || !tgt || src === tgt) return;
    const table: any = this.tsTable;
    const leaves: any[] = table?.getAllLeafColumns?.() || [];
    const order: string[] = leaves.map((c: any) => String(c.id));
    const from = order.indexOf(String(src));
    const to = order.indexOf(String(tgt));
    if (from < 0 || to < 0) return;
    order.splice(to, 0, ...order.splice(from, 1));
    table?.setOptions?.((prev: any) => ({ ...prev, state: { ...prev.state, columnOrder: order } }));
    this.saveState();
  }

  protected onHeaderFilterInput(field: string, value: any) {
    const v = String(value ?? '').trim();
    const next = { ...this.filterValues() };
    if (!v) delete next[field];
    else next[field] = { op: 'contains', value: v };
    this.filterValues.set(next);
    this.loadPage(0);
    this.saveState();
  }

  protected onHeaderResizeDblClick(h: any, ev: MouseEvent) {
    ev.stopPropagation();
    this.autoSizeColumn(h);
  }

  // Prevent header drag-reorder when grabbing resizer
  protected onHeaderResizeDragStart(ev: DragEvent) {
    try {
      ev.preventDefault();
    } catch {}
    ev.stopPropagation();
  }

  // Column resize handlers (bridge to TanStack handlers)
  protected onHeaderResizeMouseDown(h: any, ev: MouseEvent) {
    ev.stopPropagation();
    // suppress header drag until mouseup
    this.suppressHeaderDrag = true;
    const end = () => {
      this.suppressHeaderDrag = false;
      window.removeEventListener('mouseup', end);
    };
    window.addEventListener('mouseup', end);
    // Always use manual handler for consistent behavior
    this.manualColumnResizeStart(h, ev.clientX);
  }

  protected onHeaderResizeTouchStart(h: any, ev: TouchEvent) {
    ev.stopPropagation();
    this.suppressHeaderDrag = true;
    const end = () => {
      this.suppressHeaderDrag = false;
      window.removeEventListener('touchend', end);
    };
    window.addEventListener('touchend', end);
    // Always use manual handler for consistent behavior
    this.manualColumnResizeStart(h, ev.touches?.[0]?.clientX ?? 0);
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

  protected onRowCheckboxChange(row: any, checked: boolean) {
    if (this.allSelected()) {
      const id = this.toId(row.original ?? row);
      if (!id) return;
      updateAllSelectedIdSet(this.allSelectedIdSet, id, checked);
      this.onSelectionChanged();
      return;
    }
    if (typeof row?.toggleSelected === 'function') row.toggleSelected(checked);
  }

  // Virtualization helpers
  protected onScroll(event: Event) {
    const el = event.target as HTMLElement;
    this.scrollTop.set(el.scrollTop || 0);
    this.viewportH.set(el.clientHeight || this.viewportH());
    this.virtualizer?.scrollToOffset?.(el.scrollTop || 0);
    // Infinite append: when near bottom, fetch next page if available
    try {
      if (this.canNext() && !this.isLoading() && !this.fetchingNext) {
        const nearBottom = this.endIndex() > this.rows().length - 10;
        if (nearBottom) {
          this.fetchingNext = true;
          this.nextPage().finally(() => (this.fetchingNext = false));
        }
      }
    } catch {}
  }

  // Prevent drag-reorder when grabbing selection resizer
  protected onSelectionResizeDragStart(ev: DragEvent) {
    try {
      ev.preventDefault();
    } catch {}
    ev.stopPropagation();
  }

  // Selection column resize
  protected onSelectionResizeMouseDown(ev: MouseEvent) {
    ev.stopPropagation();
    this._selStartX = ev.clientX;
    this._selStartW = this.selectionStickyWidth();
    const move = (e: MouseEvent) => this.continueSelectionResize(e.clientX);
    const up = () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
      this.endSelectionResize();
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  }

  protected onSelectionResizeTouchStart(ev: TouchEvent) {
    ev.stopPropagation();
    const x = ev.touches?.[0]?.clientX ?? 0;
    this._selStartX = x;
    this._selStartW = this.selectionStickyWidth();
    const move = (e: TouchEvent) => this.continueSelectionResize(e.touches?.[0]?.clientX ?? 0);
    const up = () => {
      window.removeEventListener('touchmove', move);
      window.removeEventListener('touchend', up);
      this.endSelectionResize();
    };
    window.addEventListener('touchmove', move);
    window.addEventListener('touchend', up);
  }

  protected onToggleFilterOption(field: string, option: string, checked: boolean) {
    const current = this.getFilterArray(field);
    let nextArr: string[] = current.slice();
    if (checked && !nextArr.includes(option)) nextArr.push(option);
    if (!checked) nextArr = nextArr.filter((o) => o !== option);
    const next: Record<string, any> = { ...this.filterValues() };
    if (nextArr.length === 0) delete next[field];
    else next[field] = { op: 'in', value: nextArr };
    this.filterValues.set(next);
    this.loadPage(0);
    this.saveState();
  }

  /** Called when row is double-clicked. */
  protected openEditOnDoubleClick(row: any) {
    this.openEdit(row?.id);
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

  protected pinLeft(h: any) {
    const pin = h?.column?.pin;
    if (typeof pin === 'function') pin.call(h.column, 'left');
    this.saveState();
  }

  protected pinRight(h: any) {
    const pin = h?.column?.pin;
    if (typeof pin === 'function') pin.call(h.column, 'right');
    this.saveState();
  }

  // Column pinning helpers
  protected pinState(h: any): 'left' | 'right' | false {
    const fn = h?.column?.getIsPinned;
    return typeof fn === 'function' ? (fn.call(h.column) as 'left' | 'right' | false) : false;
  }

  protected async prevPage() {
    if (!this.canPrev()) return;
    await this.loadPage(this.pageIndex() - 1);
  }

  /** Triggers a full grid refresh via backend. */
  protected async refresh(): Promise<void> {
    await this.loadPage(this.pageIndex());
  }

  protected resetAllWidths() {
    this.colWidths.set({});
    const sizing: Record<string, number> = {};
    this.tsTable?.setOptions((prev: any) => ({ ...prev, state: { ...prev.state, columnSizing: sizing } }));
    queueMicrotask(() => this.updatePinOffsets());
    this.saveState();
  }

  protected resetColWidth(h: any) {
    const id = this.getFieldFromHeader(h);
    if (!id) return;
    const sizing = { ...((this.tsTable!.getState() as any).columnSizing || {}) };
    if (id in sizing) delete sizing[id];
    this.colWidths.update((m) => {
      const next = { ...(m || {}) };
      delete next[id!];
      return next;
    });
    this.tsTable?.setOptions((prev: any) => ({ ...prev, state: { ...prev.state, columnSizing: sizing } }));
    queueMicrotask(() => this.updatePinOffsets());
  }

  protected rightOffsetPx(colId: string): number {
    return this.pinnedRightOffsets()[colId] || 0;
  }

  /** Select all rows that match current search/tags (server- or client-side). */
  protected async selectAllMatching() {
    try {
      const options: any = {
        searchStr: this.searchSvc.getFilterText(),
        tags: this.limitToTags(),
      };
      const { rows, count } = this.archiveMode()
        ? await this.gridSvc.getAllArchived(options as getAllOptionsType)
        : await this.gridSvc.getAll(options as getAllOptionsType);
      const ids = (rows ?? []).map((r: any) => String(r.id)).filter(Boolean);
      this.allSelectedIds = ids;
      this.allSelectedIdSet = new Set(ids);
      this.allSelectedCount = count ?? ids.length;
      this.allSelected.set(ids.length > 0);
      this.alertSvc.showInfo(`Selected ${this.allSelectedCount} row(s)`);
    } catch (e) {
      this.alertSvc.showError('Failed to select all rows');
    }
  }

  protected setColWidth(id: string, px: number) {
    const next = { ...this.colWidths() };
    next[id] = Math.max(40, Math.floor(px));
    this.colWidths.set(next);
    // After width change, recompute sticky offsets
    queueMicrotask(() => this.updateHeaderWidths());
  }

  // Column visibility bulk actions
  protected showAllCols() {
    const v = { ...this.colVisibility() };
    for (const c of this.colDefsWithEdit) if (c.field) v[c.field] = true;
    this.colVisibility.set(v);
    if (this.tsTable)
      this.tsTable.setOptions((prev: any) => ({ ...prev, state: { ...prev.state, columnVisibility: v } }));
  }

  protected showColumnById(id: string) {
    this.toggleCol(id, true);
    const col = (this.tsTable as any)?.getColumn?.(id);
    if (col?.toggleVisibility) col.toggleVisibility(true);
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

  protected sortIndicator(col: ColDef): string {
    if (!col.field) return '';
    if (this.sortCol() !== col.field) return '';
    return this.sortDir() === 'asc' ? '▲' : this.sortDir() === 'desc' ? '▼' : '';
  }

  protected sortIndicatorForHeader(h: any): string {
    const s = typeof h?.column?.getIsSorted === 'function' ? h.column.getIsSorted() : undefined;
    if (s === 'asc') return '▲';
    if (s === 'desc') return '▼';
    return '';
  }

  protected startEdit(row: any, col: ColDef) {
    if (!this.isEditable(col) || !col.field) return;
    const id = this.toId(row);
    if (!id) return;
    this.editingCell.set({ id, field: col.field });
    this.editingValue.set(this.getCellValue(row, col));
  }

  protected startIndex(): number {
    const items = this.virtualizer?.getVirtualItems() ?? [];
    if (items.length) return items[0].index;
    // Fallback before virtualizer initializes
    return Math.max(0, Math.floor((this.scrollTop() || 0) / this.rowHeight));
  }

  // Row selection helpers (TanStack-driven)
  protected tableAllPageSelected(): boolean {
    return !!this.tsTable?.getIsAllPageRowsSelected?.();
  }

  protected tableSomePageSelected(): boolean {
    return !!this.tsTable?.getIsSomePageRowsSelected?.();
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
    this.saveState();
  }

  protected toggleHeaderSort(h: any, ev?: MouseEvent) {
    const fn = h?.column?.toggleSorting;
    if (typeof fn === 'function') fn.call(h.column, undefined, !!ev?.shiftKey);
  }

  protected togglePageChecked(checked: boolean) {
    if (this.allSelected()) this.allSelected.set(false);
    const nextSet = togglePageSelectionSet(this.selectedIdSet(), this.rows() as any[], checked);
    this.selectedIdSet.set(nextSet);
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

  protected topPadHeight(): number {
    const items = this.virtualizer?.getVirtualItems() ?? [];
    if (items.length) return items[0].start;
    return this.startIndex() * this.rowHeight;
  }

  // Pagination
  // totalPages is computed

  protected unpin(h: any) {
    const pin = h?.column?.pin;
    if (typeof pin === 'function') pin.call(h.column, false);
    this.saveState();
  }

  protected visibleCount(): number {
    const items = this.virtualizer?.getVirtualItems() ?? [];
    if (items.length) return items.length;
    const vp = this.viewportH() || 0;
    return Math.max(1, Math.ceil(vp / this.rowHeight) + 6);
  }

  protected visibleRows(): Partial<RowOf<T>>[] {
    return this.rows().slice(this.startIndex(), this.endIndex());
  }

  protected visibleTableRows(): any[] {
    const tbl: any = this.tsTable;
    const all = tbl?.getRowModel?.().rows || [];
    const start = this.startIndex();
    const end = this.endIndex();
    return all.slice(start, end);
  }

  /** Helper: applies single-field patch */
  private async applyEdit(id: string, data: any): Promise<boolean> {
    return this.gridSvc
      .update(id, data as U)
      .then(() => true)
      .catch(() => false);
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

  private coerceEditingValue(col: ColDef, raw: any): any {
    const t = this.inputTypeFor(col);
    if (t === 'number') {
      const n = typeof raw === 'number' ? raw : parseFloat(String(raw ?? '').trim());
      return isNaN(n) ? null : n;
    }
    if (t === 'date') {
      const v = String(raw ?? '').trim();
      // normalize to YYYY-MM-DD if possible
      return v.length > 10 ? v.slice(0, 10) : v;
    }
    return raw;
  }

  private continueSelectionResize(clientX: number) {
    const dx = clientX - this._selStartX;
    const w = Math.max(32, this._selStartW + dx);
    this.selectionStickyWidth.set(Math.round(w));
    this.updatePinOffsets();
  }

  private endSelectionResize() {
    this.saveState();
  }

  private async loadPage(index: number, append = false) {
    const end = this._loading.begin();
    try {
      const pageSize = this.config.pageSize;
      const startRow = index * pageSize;
      const endRow = startRow + pageSize;
      const sortState = this.sorting();
      const options = buildGetAllOptions({
        searchStr: this.searchSvc.getFilterText(),
        startRow,
        endRow,
        tags: this.limitToTags(),
        filterModel: this.buildFilterModel(),
        sortState: sortState as any,
        sortCol: this.sortCol(),
        sortDir: this.sortDir(),
      });
      const data = this.archiveMode()
        ? await this.gridSvc.getAllArchived(options as getAllOptionsType)
        : await this.gridSvc.getAll(options as getAllOptionsType);
      const incoming = (data.rows as Partial<RowOf<T>>[]) ?? [];
      if (append && this.rows().length > 0) {
        this.rows.update((curr) => [...curr, ...incoming]);
      } else {
        this.rows.set(incoming);
      }
      // Update virtualizer and table data
      if (this.virtualizer) {
        this.virtualizer.setOptions({
          ...this.virtualizer.options,
          count: this.rows().length,
        });
      }
      setTableData(
        this.tsTable,
        this.rows() as any[],
        this.buildRowSelectionForCurrentData(),
        this.sortCol(),
        this.sortDir(),
      );
      this.totalCountAll = data.count ?? this.rows().length;
      this.pageIndex.set(index);
    } catch (e) {
      this.alertSvc.showError(this.config.messages.loadFailed);
    } finally {
      end();
    }
  }

  private loadState() {
    try {
      const raw = localStorage.getItem(this._persistKey);
      const data = parsePersistState(raw);
      if (!data) return;
      if (data.sorting) this.sorting.set(data.sorting);
      if (data.visibility) this.colVisibility.set(data.visibility);
      if (data.filters) this.filterValues.set(data.filters);
      if (typeof data.selectionWidth === 'number') this.selectionStickyWidth.set(data.selectionWidth);
      queueMicrotask(() => {
        if (!this.tsTable) return;
        this.tsTable.setOptions((prev: any) => ({
          ...prev,
          state: {
            ...prev.state,
            sorting: data.sorting || prev.state.sorting,
            columnVisibility: data.visibility || prev.state.columnVisibility,
            columnPinning: data.pinning || prev.state.columnPinning,
            columnSizing: data.sizing || prev.state.columnSizing,
            columnOrder: data.order || prev.state.columnOrder,
          },
        }));
        this.colWidths.set({ ...(data.sizing || {}) });
        this.updatePinOffsets();
      });
    } catch {}
  }

  private manualColumnResizeMove(col: any, clientX: number) {
    const dx = clientX - this._colStartX;
    const w = Math.max(40, Math.floor(this._colStartW + dx));
    if (typeof col.setSize === 'function') col.setSize(w);
    else this.setColWidth(String(col.id || ''), w);
    this.updatePinOffsets();
  }

  private manualColumnResizeStart(h: any, clientX: number) {
    const col = h?.column;
    if (!col) return;
    const id = String(col.id || '');
    const startW = Number(
      (typeof col.getSize === 'function' ? col.getSize() : undefined) || this.getColWidth(id) || 100,
    );
    this._colStartX = clientX;
    this._colStartW = startW;
    const move = (e: MouseEvent) => this.manualColumnResizeMove(col, e.clientX);
    const up = () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
      this.saveState();
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  }

  private saveState() {
    try {
      const st: any = this.tsTable?.getState?.() ?? {};
      const data = {
        sorting: st.sorting || [],
        visibility: st.columnVisibility || {},
        pinning: st.columnPinning || { left: [], right: [] },
        sizing: st.columnSizing || {},
        order: st.columnOrder || [],
        filters: this.filterValues() || {},
        selectionWidth: this.selectionStickyWidth(),
      };
      localStorage.setItem(this._persistKey, makePersistState(data));
    } catch {}
  }

  /** Helper: prevents editing specific fields */
  private shouldBlockEdit(row: Partial<RowOf<T>>, key: keyof any): boolean {
    return 'deletable' in (row as any) && (row as any).deletable === false && (key as string) === 'name';
  }

  private syncSignalsFromTable() {
    const st: any = this.tsTable?.getState?.() ?? {};
    if (st.sorting) this.sorting.set(st.sorting);
    if (st.columnVisibility) this.colVisibility.set(st.columnVisibility);
    // Recompute pin offsets when pinning state changes
    this.updatePinOffsets();
    this.saveState();
  }

  private updateEditedRowInCaches(id: string, field: string | undefined, value: any) {
    if (!field) return;
    // Update visible rows array
    this.rows.update((curr) => curr.map((r: any) => (String(r?.id) === id ? { ...r, [field]: value } : r)) as any);
  }

  private updatePinOffsets() {
    const tbl: any = this.tsTable;
    const pin = tbl?.getState?.().columnPinning || { left: [], right: [] };
    const { left, right } = computePinOffsets({
      pinned: { left: Array.isArray(pin.left) ? pin.left : [], right: Array.isArray(pin.right) ? pin.right : [] },
      getColWidth: (id) => this.getColWidth(id),
      headerWidthMap: this.headerWidthMap,
      selectionStickyWidth: this.selectionStickyWidth(),
    });
    this.pinnedLeftOffsets.set(left);
    this.pinnedRightOffsets.set(right);
  }

  // Update table data with current visible window (fallback implementation)
  // For now, map to the visibleRows() slice when virtualizer is active
  private updateTableWindow(start: number, end: number) {
    applyTableWindow(
      this.tsTable,
      this.rows() as any[],
      start,
      end,
      this.buildRowSelectionForCurrentData(),
      this.sortCol(),
      this.sortDir(),
    );
  }
}
