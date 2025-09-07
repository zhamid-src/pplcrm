import { ChangeDetectionStrategy, Component, OnInit, effect, inject, input, output, signal } from "@angular/core";
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
export class DataGrid<T extends keyof Models, U> implements OnInit {
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

  // Table state (TanStack-like minimal state)
  protected rows = signal<Partial<T>[]>([]);
  protected sortCol = signal<string | null>(null);
  protected sortDir = signal<'asc' | 'desc' | null>(null);
  protected totalCountAll = 0;

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
    return { filterModel: {} } as getAllOptionsType;
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
    await this.loadPage(0);
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
      return String(fn({ data: row, value: this.getCellValue(row, col), colDef: col }));
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
    // No side panel in TanStack swap (no-op for now)
  }

  // Helpers for template-safe access to dynamic fields/formatters/renderers
  protected getCellValue(row: any, col: ColDef): any {
    const field = (col.field as string) || '';
    return field ? (row as any)?.[field] : undefined;
  }

  /** Number of rows displayed on the current page */
  protected getDisplayedCount(): number {
    return this.rows().length;
  }

  protected hasCellRenderer(col: ColDef): boolean {
    return !!(col as any)?.cellRenderer;
  }

  protected headerClick(col: ColDef) {
    if (!this.isSortable(col) || !col.field) return;
    const currentCol = this.sortCol();
    const currentDir = this.sortDir();
    if (currentCol !== col.field) {
      this.sortCol.set(col.field);
      this.sortDir.set('asc');
    } else {
      // cycle asc -> desc -> none
      if (currentDir === 'asc') this.sortDir.set('desc');
      else if (currentDir === 'desc') {
        this.sortCol.set(null);
        this.sortDir.set(null);
      } else this.sortDir.set('asc');
    }
    this.loadPage(0);
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
      const options: any = {
        searchStr: this.searchSvc.getFilterText(),
        startRow,
        endRow,
        tags: this.limitToTags(),
        sortModel:
          this.sortCol() && this.sortDir()
            ? [{ colId: this.sortCol(), sort: this.sortDir() }]
            : [],
      } as Partial<getAllOptionsType>;
      const data = this.archiveMode()
        ? await (this.gridSvc as any).getAllArchived(options)
        : await this.gridSvc.getAll(options as any);
      this.rows.set((data.rows as Partial<T>[]) ?? []);
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
}
