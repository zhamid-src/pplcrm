import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { getAllOptionsType } from '@common';
import { Icon } from '@icons/icon';
import { PcIconNameType } from '@icons/icons.index';
import { AbstractAPIService } from '@services/api/abstract-api.service';
import { SearchService } from '@services/api/search-service';
import { ConfirmDialogService } from '@services/shared-dialog.service';
import { type SortingState, ColumnDef as TSColumnDef, type Updater } from '@tanstack/table-core';
// Virtualizer handled via controller
// Context available for future slices/controllers (not yet used here)
// import { GridContextService } from './state/grid-context.service';
import { VirtualizerController } from './controllers/virtualizer.controller';
import { AlertService } from '@uxcommon/components/alerts/alert-service';
import { createLoadingGate } from '@uxcommon/loading-gate';

import { DataGridColumnsService } from './services/columns.service';
import { PinningController } from './controllers/pinning.controller';
import { DataGridDataService } from './services/data.service';
import { DataGridFiltersService } from './services/filters.service';
import { DataGridSelectionService } from './services/selection.service';
import { DataGridTableService } from './services/table.service';
import { DataGridActionsService } from './services/actions.service';
import { DataGridNavService } from './services/nav.service';
import { DATA_GRID_CONFIG, DEFAULT_DATA_GRID_CONFIG, type DataGridConfig } from './datagrid.tokens';
import { DataGridUtilsService } from './services/utils.service';
import { type ColumnDef as ColDef, SELECTION_COLUMN } from './grid-defaults';
import { DataGridToolbarComponent } from './ui/toolbar';
import { DataGridFilterPanelComponent } from './ui/filter-panel';
import { DataGridHeaderComponent } from './ui/header';
import { DataGridInlineFiltersRowComponent } from './ui/inline-filters-row';
import { EditableCellDirective } from './directives/editable-cell.directive';
import { GridStoreService } from './services/grid-store.service';
import { ResizingController } from './controllers/resizing.controller';
import { ReorderController } from './controllers/reorder.controller';
import { KeyboardController } from './controllers/keyboard.controller';
import { EditingController } from './controllers/editing.controller';
import { FetchController } from './controllers/fetch.controller';
import { UndoManager } from './undo-redo-mgr';
import { Models } from 'common/src/lib/kysely.models';

@Component({
  selector: 'pc-datagrid',
  imports: [Icon, FormsModule, DataGridToolbarComponent, DataGridFilterPanelComponent, DataGridHeaderComponent, DataGridInlineFiltersRowComponent, EditableCellDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './datagrid.html',
  providers: [
    GridStoreService,
    VirtualizerController,
    PinningController,
    ResizingController,
    ReorderController,
    KeyboardController,
    EditingController,
    FetchController,
  ],
})
export class DataGrid<T extends keyof Models, U> implements OnInit, AfterViewInit, OnDestroy {
  private readonly config = inject<DataGridConfig>(DATA_GRID_CONFIG, { optional: true }) ?? DEFAULT_DATA_GRID_CONFIG;
  private readonly dialogs = inject(ConfirmDialogService);
  private readonly route = inject(ActivatedRoute);
  private readonly searchSvc = inject(SearchService);

  // Header resize handled by ResizingController

  //private readonly themeSvc = inject(ThemeService);
  private _loading = createLoadingGate();

  // Persistence
  private _persistKey = 'pcdg';
  // selection width tracked in store
  // Selection resize handled by ResizingController
  // dragColId handled in ReorderController
  // Infinite append state handled by controller
  @ViewChild('gridTable', { static: false }) private gridTable?: ElementRef<HTMLTableElement>;

  // Sticky pin offsets
  // header widths tracked by PinningController

  // Other State
  private lastRowHovered: string | undefined;
  private oldFilterText = '';
  // pin offsets tracked by PinningController

  // Optional cache placeholder removed (unused in current implementation)
  @ViewChild('scroller', { static: false }) private scroller?: ElementRef<HTMLDivElement>;
  private tsColumns: TSColumnDef<any, any>[] = [];
  private tsTable: any;
  private readonly pctrl = inject(PinningController);
  private updateHeaderWidths = () => {
    const table = this.gridTable?.nativeElement;
    if (!table) return;
    requestAnimationFrame(() => {
      const measured = this.pctrl.measureHeaderWidths(table);
      if (measured.selectionWidth != null) this.selectionStickyWidth.set(measured.selectionWidth);
    });
  };
  private readonly vctrl = inject(VirtualizerController);

  // Injected Services
  protected readonly alertSvc = inject(AlertService);
  private readonly columnsSvc = inject(DataGridColumnsService);
  private readonly dataSvc = inject(DataGridDataService);
  private readonly filtersSvc = inject(DataGridFiltersService);
  private readonly selSvc = inject(DataGridSelectionService);
  private readonly tableSvc = inject(DataGridTableService);
  private readonly actionsSvc = inject(DataGridActionsService);
  private readonly navSvc = inject(DataGridNavService);
  private readonly utilsSvc = inject(DataGridUtilsService);
  private readonly store = inject(GridStoreService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly rctrl = inject(ResizingController);
  private readonly kctrl = inject(KeyboardController);
  private readonly editingCtrl = inject(EditingController);
  private readonly fetchCtrl = inject(FetchController);
  private readonly reorder = inject(ReorderController);
  protected readonly countRowSelected = computed(() =>
    this.allSelected() ? this.allSelectedCount() : this.selectedIdSet().size,
  );
  

  // Computed derivations
  protected readonly totalPages = computed(() => this.dataSvc.computeTotalPages(this.totalCountAll(), this.config.pageSize));
  protected readonly canNext = computed(() => this.pageIndex() + 1 < this.totalPages());
  protected readonly canPrev = computed(() => this.pageIndex() > 0);
  protected readonly displayedCount = computed(() => this.rows().length);
  protected readonly gridSvc = inject<AbstractAPIService<T, U>>(AbstractAPIService);
  protected readonly hasSelection = computed(() =>
    this.allSelected() ? this.allSelectedCount() > 0 : this.selectedIdSet().size > 0,
  );

  // Hidden columns list for header menu as a computed
  protected readonly hiddenColumns = computed(() => {
    const v = this.colVisibility();
    return this.colDefsWithEdit.map((c) => c.field as string).filter((f) => !!f && v[f] === false) as string[];
  });
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
    this.selSvc.isPageFullySelected(this.allSelected(), this.displayedCount(), this.selectedOnPageCount()),
  );

  // State & UI Signals
  // Removed isRowSelected in favor of hasSelection computed
  protected readonly router = inject(Router);
  protected readonly undoMgr = new UndoManager();

  // Select-all-across-results state
  protected allSelected = signal(false);
  protected allSelectedCount = signal(0);
  protected allSelectedIdSet: Set<string> = new Set();
  protected allSelectedIds: string[] = [];
  protected archiveMode = signal(false);
  protected colDefsWithEdit: ColDef[] = [SELECTION_COLUMN];
  protected colVisibility = this.store.colVisibility;
  protected colWidths = this.store.colWidths;

  // Inline edit state
  protected editingCell = signal<{ id: string; field: string } | null>(null);
  protected editingValue = signal<any>('');
  protected filterValues = this.store.filterValues;
  protected isLoading = this._loading.visible;
  protected pageIndex = this.store.pageIndex;
  protected panelFilters = this.store.panelFilters;
  protected rowHeight = 36;

  // Table state (TanStack-like minimal state)
  protected rows = this.store.rows as any;
  protected selectedIdSet = this.store.selectedIdSet;
  protected selectionStickyWidth = this.store.selectionStickyWidth;
  protected showFilterPanel = signal(false);
  protected showFilters = signal(false);
  protected sortCol = signal<string | null>(null);
  protected sortDir = signal<'asc' | 'desc' | null>(null);
  protected sorting = signal<SortingState>([]);
  protected suppressHeaderDrag = false;
  protected totalCountAll = signal(0);
  // viewport handled by controller

  public readonly importCSV = output<string>();
  public readonly showArchiveIcon = input<boolean>(false);
  public readonly updateUndoSizes = this.undoMgr.updateSizes.bind(this.undoMgr);
  public readonly labelForFn = (f: string) => this.panelLabelFor(f);
  public readonly optionsForFn = (f: string) => this.panelOptionsFor(f);
  public readonly tableAllPageSelectedFn = () => this.tableAllPageSelected();
  public readonly tableSomePageSelectedFn = () => this.tableSomePageSelected();
  public readonly onHeaderCheckboxFn = (checked: boolean) => this.onHeaderCheckbox(checked);
  public readonly onSelectionResizeMouseDownFn = (ev: MouseEvent) => this.onSelectionResizeMouseDown(ev);
  public readonly onSelectionResizeTouchStartFn = (ev: TouchEvent) => this.onSelectionResizeTouchStart(ev);
  public readonly onSelectionResizeDragStartFn = (ev: DragEvent) => this.onSelectionResizeDragStart(ev);
  public readonly toggleHeaderSortFn = (h: any, ev?: MouseEvent) => this.toggleHeaderSort(h, ev);
  public readonly onHeaderDragStartFn = (h: any, ev: DragEvent) => this.onHeaderDragStart(h, ev);
  public readonly onHeaderDragOverFn = (h: any, ev: DragEvent) => this.onHeaderDragOver(h, ev);
  public readonly onHeaderDropFn = (h: any, ev: DragEvent) => this.onHeaderDrop(h, ev);
  public readonly ariaSortHeaderFn = (h: any) => this.ariaSortHeader(h);
  public readonly pinStateHFn = (h: any) => this.pinState(h);
  public readonly leftOffsetPxFn = (id: string) => this.leftOffsetPx(id);
  public readonly rightOffsetPxFn = (id: string) => this.rightOffsetPx(id);
  public readonly getColWidthFn = (id: string) => this.getColWidth(id);
  public readonly sortIndicatorForHeaderFn = (h: any) => this.sortIndicatorForHeader(h);
  public readonly getColDefByIdFn = (id: string) => this.getColDefById(id);
  public readonly getFilterOptionsForColFn = (col: any) => this.getFilterOptionsForCol(col as any);
  public readonly isOptionCheckedFn = (field: string, opt: string) => this.isOptionChecked(field, opt);
  public readonly onToggleFilterOptionFn = (field: string, opt: string, checked: boolean) => this.onToggleFilterOption(field, opt, checked);
  public readonly clearHeaderFilterFn = (field: string) => this.clearHeaderFilter(field);
  public readonly getFilterValueFn = (field: string) => this.getFilterValue(field);
  public readonly onHeaderFilterInputFn = (field: string, value: any) => this.onHeaderFilterInput(field, value);
  public readonly sortAscFn = (h: any) => this.sortAsc(h);
  public readonly sortDescFn = (h: any) => this.sortDesc(h);
  public readonly clearSortFn = (h: any) => this.clearSort(h);
  public readonly pinLeftFn = (h: any) => this.pinLeft(h);
  public readonly pinRightFn = (h: any) => this.pinRight(h);
  public readonly unpinFn = (h: any) => this.unpin(h);
  public readonly autoSizeColumnFn = (h: any) => this.autoSizeColumn(h);
  public readonly resetColWidthFn = (h: any) => this.resetColWidth(h);
  public readonly hideColumnFn = (h: any) => this.hideColumn(h);
  public readonly showColumnByIdFn = (id: string) => this.showColumnById(id);
  public readonly columnLabelForFn = (id: string) => this.columnLabelFor(id);
  // header resize handled by pcHeaderResize directive

  public readonly inlineGetColDefByIdFn = (id: string) => this.getColDefById(id);
  public readonly inlineGetFilterOptionsForColFn = (col: any) => this.getFilterOptionsForCol(col as any);
  public readonly inlineFilterLabelFn = (field: string) => this.inlineFilterLabel(field);
  public readonly inlineIsOptionCheckedFn = (field: string, opt: string) => this.isOptionChecked(field, opt);
  public readonly inlineOnToggleFilterOptionFn = (field: string, opt: string, checked: boolean) => this.onToggleFilterOption(field, opt, checked);
  public readonly inlineOnHeaderFilterInputFn = (field: string, value: any) => this.onHeaderFilterInput(field, value);
  public readonly inlineClearHeaderFilterFn = (field: string) => this.clearHeaderFilter(field);
  public readonly inlineGetFilterValueFn = (field: string) => this.getFilterValue(field);

  // Row/cell adapters used by directives/templates
  public readonly toIdFn = (row: any) => this.toId(row);
  public readonly inputTypeForFn = (col: any) => this.inputTypeFor(col);
  public readonly createPayloadFn = (row: any, key: string) => this.utilsSvc.createPayload(row, key);
  public readonly updateEditedRowInCachesFn = (id: string, f: string | undefined, v: any) => this.updateEditedRowInCaches(id, f, v);
  public readonly updateTableWindowFn = (s: number, e: number) => this.updateTableWindow(s, e);
  public readonly requestPersistFn = () => this.store.requestPersist();
  public readonly coerceFn = (c: any, raw: any) => this.coerceEditingValue(c as any, raw);

  public readonly editableCfg = (row: any, col: any) => ({
    row,
    col,
    toId: this.toIdFn,
    coerce: this.coerceFn,
    value: () => this.editingValue(),
    setEditingCell: (v: { id: string; field: string } | null) => this.editingCell.set(v),
    createPayload: this.createPayloadFn,
    applyEdit: (id: string, data: any) => this.gridSvc.update(id, data).then(() => true).catch(() => false),
    updateEditedRow: this.updateEditedRowInCachesFn,
    updateWindow: this.updateTableWindowFn,
    startIndex: () => this.startIndex(),
    endIndex: () => this.endIndex(),
    showSuccess: (m: string) => this.alertSvc.showSuccess(m),
    showError: (m: string) => this.alertSvc.showError(m),
    undo: () => this.undoMgr.undo(),
  });

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
  // gridOptions removed (unused)
  public limitToTags = input<string[]>([]);
  public plusIcon = input<PcIconNameType>('plus');
  public showToolbar = input<boolean>(true);

  constructor() {
    // React to global search (SSRM: trigger server-side filter)
    effect(() => {
      const quickFilterText = this.searchSvc.getFilterText();

      // Keep track of the old filter text to avoid unnecessary roundtrip
      if (quickFilterText != this.oldFilterText) {
        this.oldFilterText = quickFilterText;
        this.loadPage(0);
      }
    });
    // Keep table data + selection + sorting synced when rows or sort change
    effect(() => {
      const rows = this.rows();
      // touch sort signals so effect re-runs when they change
      this.sortCol();
      this.sortDir();
      this.tableSvc.setTableData(
        this.tsTable,
        rows as any[],
        this.buildRowSelectionForCurrentData(),
        this.sortCol(),
        this.sortDir(),
      );
    });
    // Virtualizer count sync handled by controller
    // Pin offsets recompute centralized in PinningController
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

  public ngAfterViewInit() {
    const el = this.scroller?.nativeElement as HTMLDivElement | undefined;
    if (el) this.vctrl.attach(el, this.rowHeight);
    // Attach controllers to the table once
    this.vctrl.attachTable(this.tsTable);
    this.pctrl.attachTable(this.tsTable);
    this.pctrl.init({
      getColWidth: (id) => this.getColWidth(id),
      getSelectionWidth: () => this.selectionStickyWidth(),
      getPinState: () => (this.tsTable?.getState?.().columnPinning ?? { left: [], right: [] }),
    });
    // Measure header widths initially and on resize
    this.updateHeaderWidths();
    window.addEventListener('resize', this.updateHeaderWidths);
  }

  public ngOnDestroy(): void {
    // Abort any inflight requests and release refs
    this.gridSvc.abort();
    this.vctrl.detach();
    this.tsTable = undefined;
    window.removeEventListener('resize', this.updateHeaderWidths);
  }

  public async ngOnInit() {
    // Initialize persistence key
    const urlKey = typeof window !== 'undefined' ? window.location?.pathname || '' : '';
    this._persistKey = `pcdg:${urlKey}`;
    // Note: allowFilter input retained for API compatibility (filter UI uses signals)
    const selectionCols = this.enableSelection() ? [SELECTION_COLUMN] : [];
    this.colDefsWithEdit = [...selectionCols, ...this.colDefs()];
    // Initialize column visibility defaults
    const vis: Record<string, boolean> = {};
    for (const c of this.colDefsWithEdit) if (c.field) vis[c.field] = true;
    this.colVisibility.set(vis);
    // Build TanStack columns
    this.tsColumns = this.tableSvc.buildTsColumns(this.colDefsWithEdit);
    this.tsTable = this.tableSvc.createGridTable({
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
        this.store.requestPersist();
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
      },
      onColumnSizingChange: (updater: Updater<Record<string, number>>) => {
        const current = (this.tsTable!.getState() as any).columnSizing || {};
        const next = typeof updater === 'function' ? (updater as any)(current) : (updater as any);
        this.colWidths.set({ ...(next || {}) });
        this.tsTable!.setOptions((prev: any) => ({ ...prev, state: { ...prev.state, columnSizing: next || {} } }));
        this.store.requestPersist();
      },
    });
    // Attach to store for syncing & persistence
    try {
      this.store.attachTable(this.tsTable);
      this.store.setPersistKey(this._persistKey);
      this.store.setGetRowId((row: any) => this.toId(row));
    } catch {}
    // Load persisted state and apply to table before first load
    this.store.loadState();
    await this.loadPage(0);
  }

  public triggerFilterChanged() {
    this.loadPage(0);
  }

  /** Navigates to add route. */
  protected add() {
    this.navSvc.navigateIfValid(this.router, this.route, this.addRoute());
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
    const px = this.columnsSvc.computeAutoSizeWidth(table, id);
    if (px > 0) this.setColWidth(id, px);
    this.store.requestPersist();
  }

  protected bottomPadHeight(): number {
    return this.vctrl.bottomPadHeight();
  }

  // Build a compact filter model from current UI filter values
  protected buildFilterModel(): Record<string, any> {
    return this.filtersSvc.buildFilterModel(this.filterValues());
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

  // canNext/canPrev are computed
  protected cancelEdit() {
    this.editingCell.set(null);
  }

  /** Clear both grid selection and the select-all cache */
  protected clearAllSelection() {
    this.allSelected.set(false);
    this.allSelectedIds = [];
    this.allSelectedIdSet = new Set();
    this.allSelectedCount.set(0);
  }

  protected clearHeaderFilter(field: string) {
    const next = { ...this.filterValues() };
    delete next[field];
    this.filterValues.set(next);
    this.loadPage(0);
    this.store.requestPersist();
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
    const value = this.editingValue();
    await this.editingCtrl.commitSingleCell({
      row,
      col,
      currentValue: this.coerceEditingValue(col, value),
      toId: (r) => this.toId(r),
      createPayload: (r, k) => this.utilsSvc.createPayload(r, k),
      applyEdit: (id, data) => this.applyEdit(id, data),
      updateEditedRowInCaches: (id, field, v) => this.updateEditedRowInCaches(id, field, v),
      updateTableWindow: (s, e) => this.updateTableWindow(s, e),
      startIndex: () => this.startIndex(),
      endIndex: () => this.endIndex(),
      showSuccess: (m) => this.alertSvc.showSuccess(m),
      showError: (m) => this.alertSvc.showError(m),
      undo: () => this.undoMgr.undo(),
    });
    this.editingCell.set(null);
  }

  /** Confirm and then delete selected rows */
  protected async confirmDelete(): Promise<void> {
    if (this.disableDelete()) {
      this.alertSvc.showError(this.config.messages.noDeletePermission);
      return;
    }

    await this.actionsSvc.confirmDeleteAndRun({
      _loading: this._loading,
      dialogs: this.dialogs,
      alertSvc: this.alertSvc,
      getSelectedRows: () => this.getSelectedRows(),
      gridSvc: this.gridSvc,
      config: this.config,
    });

    // Always clear our select-all cache after a delete attempt
    this.clearAllSelection();
    await this.refresh();
  }

  /** Warn about export scope, then export */
  protected async confirmExport(): Promise<void> {
    await this.actionsSvc.doExportCsv({
      dialogs: this.dialogs,
      alertSvc: this.alertSvc,
      config: this.config,
      getRowsForExport: () => this.rows().map((r: any) => ({ ...r })),
    });
  }

  protected cyclePin(h: any) {
    const current = this.pinState(h);
    const next = current === 'left' ? 'right' : current === 'right' ? false : 'left';
    const pin = h?.column?.pin;
    if (typeof pin === 'function') pin.call(h.column, next as any);
    this.store.requestPersist();
  }

  /** Triggers the import CSV flow (placeholder only). */
  protected doImportCSV() {
    // Emit a simple signal so consumers can open their import UI
    this.importCSV.emit('open');
  }

  protected endIndex(): number {
    return this.vctrl.endIndex();
  }

  // exportToCSV removed (legacy path)
  protected filter() {
    // Open right-side filter panel and seed with current filters
    const current = this.filterValues();
    this.panelFilters.set(this.filtersSvc.preparePanelFilters(current));
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
    return this.filtersSvc.getFilterArray(this.filterValues(), field);
  }

  // Helper to derive filter select options from a column definition
  protected getFilterOptionsForCol(col: ColDef): string[] | null {
    return this.filtersSvc.getFilterOptionsForCol(col);
  }

  protected getFilterValue(field: string): string {
    return this.filtersSvc.getFilterValue(this.filterValues(), field);
  }

  /** Utility: returns selected rows from grid */
  protected getSelectedRows() {
    if (this.allSelected()) {
      return this.allSelectedIds.map((id) => ({ id })) as unknown as (Partial<RowOf<T>> & { id: string })[];
    }
    const ids = this.selectedIdSet();
    return Array.from(ids).map((id) => ({ id })) as unknown as (Partial<RowOf<T>> & { id: string })[];
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

  // headerClick removed; using explicit header API bindings instead

  protected headerGroups(): any[] {
    const tbl: any = this.tsTable;
    return tbl?.getHeaderGroups?.() || [];
  }

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
    return this.filtersSvc.inlineFilterLabel(this.filterValues(), field);
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

  // Theme no-op (unused)

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

  protected leftOffsetPx(colId: string): number { return this.pctrl.leftOffsetPx(colId); }

  // merge action removed

  protected async nextPage() {
    if (!this.canNext()) return;
    await this.loadPage(this.pageIndex() + 1, true);
  }

  // Keyboard navigation between cells
  protected onCellKeydown(ev: KeyboardEvent) {
    // Ignore key handling when an input/select inside the cell is focused
    const tag = (ev.target as HTMLElement)?.tagName?.toLowerCase?.() || '';
    if (tag === 'input' || tag === 'select' || tag === 'textarea') return;
    this.kctrl.handleCellKeydown(ev, {
      getColDefById: (id) => this.getColDefById(id),
      isEditable: (col) => this.isEditable(col),
      startEdit: (row, col) => this.startEdit(row, col),
      rows: () => this.rows(),
    });
  }

  /** Called when a row is hovered. Used to track row ID. */
  protected onCellMouseOver(row: any) {
    this.lastRowHovered = row?.id;
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
    this.reorder.onDragOver(ev);
  }

  // Column reordering (drag-and-drop)
  protected onHeaderDragStart(h: any, ev: DragEvent) {
    this.reorder.configure({ suppressHeaderDrag: () => this.suppressHeaderDrag, requestPersist: () => this.store.requestPersist() });
    this.reorder.onDragStart(h, ev);
  }

  protected onHeaderDrop(h: any, ev: DragEvent) {
    this.reorder.onDrop(h, ev, this.tsTable);
  }

  protected onHeaderFilterInput(field: string, value: any) {
    const v = String(value ?? '').trim();
    const next = { ...this.filterValues() };
    if (!v) delete next[field];
    else next[field] = { op: 'contains', value: v };
    this.filterValues.set(next);
    this.loadPage(0);
    this.store.requestPersist();
  }

  // header resize is handled via HeaderResizeDirective

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
      const next = new Set(this.allSelectedIdSet);
      if (checked) next.add(id);
      else next.delete(id);
      this.allSelectedIdSet = next;
      this.cdr.markForCheck();
      return;
    }
    if (typeof row?.toggleSelected === 'function') row.toggleSelected(checked);
  }

  // Virtualization helpers
  protected onScroll(event: Event) {
    this.vctrl.configurePaging({
      canNext: () => this.canNext(),
      isLoading: () => this.isLoading(),
      nextPage: () => this.nextPage(),
    });
    this.vctrl.onScroll(event);
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
    const startW = this.selectionStickyWidth();
    this.rctrl.beginSelectionResize(
      ev.clientX,
      startW,
      (w) => {
        this.selectionStickyWidth.set(w);
      },
      () => this.store.requestPersist(),
    );
  }

  protected onSelectionResizeTouchStart(ev: TouchEvent) {
    ev.stopPropagation();
    const x = ev.touches?.[0]?.clientX ?? 0;
    const startW = this.selectionStickyWidth();
    this.rctrl.beginSelectionResizeTouch(
      x,
      startW,
      (w) => {
        this.selectionStickyWidth.set(w);
      },
      () => this.store.requestPersist(),
    );
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
    this.store.requestPersist();
  }

  /** Opens edit form for row. */
  protected openEdit(id: string) {
    return this.view(id);
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
    this.store.requestPersist();
  }

  protected pinRight(h: any) {
    const pin = h?.column?.pin;
    if (typeof pin === 'function') pin.call(h.column, 'right');
    this.store.requestPersist();
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
    this.store.requestPersist();
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
  }

  protected rightOffsetPx(colId: string): number {
    return this.pctrl.rightOffsetPx(colId);
  }

  /** Select all rows that match current search/tags (server- or client-side). */
  protected async selectAllMatching() {
    try {
      const { ids, count } = await this.fetchCtrl.selectAllMatching({
        archiveMode: this.archiveMode(),
        searchText: this.searchSvc.getFilterText(),
        limitToTags: this.limitToTags(),
        gridSvc: this.gridSvc as any,
      });
      this.allSelectedIds = ids;
      this.allSelectedIdSet = new Set(ids);
      this.allSelectedCount.set(count);
      this.allSelected.set(ids.length > 0);
      this.alertSvc.showInfo(`Selected ${this.allSelectedCount()} row(s)`);
    } catch {
      this.alertSvc.showError('Failed to select all rows');
    }
  }

  // reapplySelectionToVisible removed (selection handled via signals)

  /** Cancels the fetch call and hides loader. */
  protected sendAbort() {
    this.gridSvc.abort();
  }

  protected setColWidth(id: string, px: number) {
    const next = { ...this.colWidths() };
    next[id] = Math.max(40, Math.floor(px));
    this.colWidths.set(next);
    // After width change, recompute sticky offsets
    this.updateHeaderWidths();
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

  protected sortIndicatorForHeader(h: any): PcIconNameType {
    const s = typeof h?.column?.getIsSorted === 'function' ? h.column.getIsSorted() : undefined;
    if (s === 'asc') return 'chevron-up';
    if (s === 'desc') return 'chevron-down';
    return 'none';
  }

  protected startEdit(row: any, col: ColDef) {
    if (!this.isEditable(col) || !col.field) return;
    const id = this.toId(row);
    if (!id) return;
    this.editingCell.set({ id, field: col.field });
    this.editingValue.set(this.getCellValue(row, col));
  }

  protected startIndex(): number {
    return this.vctrl.startIndex();
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
    this.store.requestPersist();
  }

  protected toggleHeaderSort(h: any, ev?: MouseEvent) {
    const fn = h?.column?.toggleSorting;
    if (typeof fn === 'function') fn.call(h.column, undefined, !!ev?.shiftKey);
  }

  protected togglePageChecked(checked: boolean) {
    if (this.allSelected()) this.allSelected.set(false);
    const nextSet = this.selSvc.togglePageSelectionSet(this.selectedIdSet(), this.rows() as any[], checked);
    this.selectedIdSet.set(nextSet);
  }

  protected toggleRowChecked(id: string, checked: boolean) {
    if (this.allSelected()) {
      const next = new Set(this.allSelectedIdSet);
      if (checked) next.add(id);
      else next.delete(id);
      this.allSelectedIdSet = next;
      this.cdr.markForCheck();
    } else {
      const set = new Set(this.selectedIdSet());
      if (checked) set.add(id);
      else set.delete(id);
      this.selectedIdSet.set(set);
    }
  }

  protected topPadHeight(): number {
    return this.vctrl.topPadHeight();
  }

  // Pagination
  // totalPages is computed
  protected unpin(h: any) {
    const pin = h?.column?.pin;
    if (typeof pin === 'function') pin.call(h.column, false);
    this.store.requestPersist();
  }

  protected visibleCount(): number {
    return this.vctrl.visibleCount();
  }

  protected visibleTableRows(): any[] {
    return this.vctrl.visibleTableRows();
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

  // selection resize handled by ResizingController

  private async loadPage(index: number, append = false) {
    await this.fetchCtrl.loadPage({
      index,
      append,
      pageSize: this.config.pageSize,
      archiveMode: this.archiveMode(),
      searchText: this.searchSvc.getFilterText(),
      limitToTags: this.limitToTags(),
      filterModel: this.buildFilterModel(),
      sortState: this.sorting() as any,
      sortCol: this.sortCol(),
      sortDir: this.sortDir(),
      gridSvc: this.gridSvc as any,
      dataSvc: this.dataSvc as any,
      getRows: () => this.rows(),
      setRows: (rows: any[]) => this.rows.set(rows as any),
      updateTableData: (rows: any[]) =>
        this.tableSvc.setTableData(
          this.tsTable,
          rows,
          this.buildRowSelectionForCurrentData(),
          this.sortCol(),
          this.sortDir(),
        ),
      setVirtualCount: (count: number) => this.vctrl.setCount(count),
      setTotalCountAll: (n: number) => this.totalCountAll.set(n),
      setPageIndex: (i: number) => this.pageIndex.set(i),
      begin: () => this._loading.begin(),
      showError: (m: string) => this.alertSvc.showError(m),
      loadFailedMsg: this.config.messages.loadFailed,
    });
  }

  // Persistence handled by GridStoreService

  // header resize handled by ResizingController

  // onCellValueChanged handled by EditingController

  // saveState removed (consolidated into GridStoreService)

  // shouldBlockEdit handled by EditingController

  private syncSignalsFromTable() {
    const st: any = this.tsTable?.getState?.() ?? {};
    if (st.sorting) this.sorting.set(st.sorting);
    if (st.columnVisibility) this.colVisibility.set(st.columnVisibility);
    // Notify pin-state change so controller effect recomputes offsets
    this.pctrl.notifyPinStateChanged();
    this.store.requestPersist();
  }

  private updateEditedRowInCaches(id: string, field: string | undefined, value: any) {
    if (!field) return;
    // Update visible rows array
    this.rows.update((curr: any[]) => curr.map((r: any) => (String(r?.id) === id ? { ...r, [field]: value } : r)) as any);
  }

  // pin offsets handled by PinningController

  // Update table data with current visible window
  private updateTableWindow(start: number, end: number) {
    this.tableSvc.updateTableWindow(
      this.tsTable,
      this.rows() as any[],
      start,
      end,
      this.buildRowSelectionForCurrentData(),
      this.sortCol(),
      this.sortDir(),
    );
  }

  /** Navigates to view route for given ID or last hovered ID. */
  private view(id?: string) {
    return this.navSvc.viewIfAllowed({
      id,
      lastRowHovered: this.lastRowHovered,
      disableView: this.disableView(),
      navigate: (path) => this.navSvc.navigateIfValid(this.router, this.route, path),
    });
  }
}

type RowOf<K extends keyof Models> = Models[K];
