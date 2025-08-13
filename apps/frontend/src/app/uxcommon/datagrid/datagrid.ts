import { Component, EventEmitter, OnInit, Output, effect, inject, input, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { debounce, getAllOptionsType } from '@common';
import { Icon } from '@icons/icon';
import { IconName } from '@icons/icons.index';
import { AlertService } from '@uxcommon/alerts/alert-service';
import { ConfirmDialogService } from '@uxcommon/shared-dialog-service';

import { AgGridModule } from 'ag-grid-angular';
import {
  CellDoubleClickedEvent,
  CellMouseOverEvent,
  CellValueChangedEvent,
  ColDef,
  GetRowIdParams,
  GridApi,
  GridOptions,
  GridReadyEvent,
  IServerSideDatasource,
  IServerSideGetRowsParams,
  colorSchemeDarkBlue,
  themeQuartz,
} from 'ag-grid-community';

import { AbstractAPIService } from '../../abstract-api.service';
import { SELECTION_COLUMN, defaultGridOptions } from './grid-defaults';
import { GridActionComponent } from './tool-button';
import { UndoManager } from './undo-redo-mgr';
import { SearchService } from 'apps/frontend/src/app/backend-svc/search-service';
import { ThemeService } from 'apps/frontend/src/app/layout/theme-service';
import { Models } from 'common/src/lib/kysely.models';

@Component({
  selector: 'pc-datagrid',
  imports: [AgGridModule, Icon, GridActionComponent],
  templateUrl: './datagrid.html',
})
export class DataGrid<T extends keyof Models, U> implements OnInit {
  private readonly dialogs = inject(ConfirmDialogService);
  private readonly route = inject(ActivatedRoute);
  private readonly searchSvc = inject(SearchService);
  private readonly themeSvc = inject(ThemeService);

  private debouncedFilter = debounce(() => this.api?.onFilterChanged());

  // Other State
  private lastRowHovered: string | undefined;
  private rowModelType = signal<'clientSide' | 'serverSide'>('clientSide');

  // Injected Services
  protected readonly alertSvc = inject(AlertService);
  protected readonly distinctTags: string[] = [];
  protected readonly gridSvc = inject<AbstractAPIService<T, U>>(AbstractAPIService);

  // State & UI Signals
  protected readonly isRowSelected = signal(false);
  protected readonly router = inject(Router);
  protected readonly undoMgr = new UndoManager();
  protected readonly updateUndoSizes = this.undoMgr.updateSizes.bind(this.undoMgr);

  // AG Grid
  protected api: GridApi<Partial<T>> | undefined;
  protected colDefsWithEdit: ColDef[] = [SELECTION_COLUMN];
  protected gridVisible = signal(false);
  protected mergedGridOptions: Partial<GridOptions> = {};

  public readonly CLIENT_SERVER_THRESHOLD = 15;

  // Inputs & Outputs
  public addRoute = input<string | null>(null);
  public colDefs = input<ColDef[]>([]);
  public disableDelete = input<boolean>(true);
  public disableExport = input<boolean>(false);
  public disableImport = input<boolean>(true);
  public disableRefresh = input<boolean>(false);
  public disableView = input<boolean>(true);
  public gridOptions = input<GridOptions<Partial<T>>>({});
  @Output() public importCSV = new EventEmitter<string>();
  public limitToTags = input<string[]>([]);
  public plusIcon = input<IconName>('plus');

  constructor() {
    effect(() => {
      const quickFilterText = this.searchSvc.getFilterText();
      if (this.rowModelType() === 'clientSide') {
        this.api?.updateGridOptions({ quickFilterText });
      } else {
        this.debouncedFilter();
      }
    });
  }

  /** Confirm and then delete selected rows */
  public async confirmDelete(): Promise<void> {
    if (this.disableDelete()) {
      // keep your existing toast if you prefer
      this.alertSvc.showError('You do not have the permission to delete rows from this table.');
      return;
    }

    const ok = await this.dialogs.confirm({
      title: 'Are you sure?',
      message: 'The selected rows will be deleted permanently. You cannot undo this.',
      variant: 'danger',
      icon: 'trash',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      allowBackdropClose: false,
    });

    if (!ok) return;

    try {
      await this.deleteSelectedRows();
    } catch (e) {
      console.error(e);
      this.alertSvc.showError('Failed to delete rows. Please try again.');
    }
  }

  public createServerSideDatasource(): IServerSideDatasource {
    return {
      getRows: async (params: IServerSideGetRowsParams) => {
        try {
          this.api?.setGridOption('loading', true);

          const searchStr = this.searchSvc.getFilterText();
          const { startRow, sortModel, filterModel } = params.request;
          const options = {
            searchStr,
            startRow,
            endRow: (startRow || 0) + 10, // TODO: page size
            sortModel,
            filterModel,
            tags: this.limitToTags(),
          } as getAllOptionsType;

          const data = await this.gridSvc.getAll(options);
          params.success({ rowData: data.rows, rowCount: data.count });

          // If it just returns rows:
          // params.success({ rowData: rows, rowCount: undefined });
        } catch (err) {
          console.log('error', err);
          params.fail();
        } finally {
          this.api?.setGridOption('loading', false);
        }
      },
    };
  }

  public async ngOnInit() {
    const rowCount = await this.gridSvc.count();
    this.rowModelType.set(rowCount < this.CLIENT_SERVER_THRESHOLD ? 'clientSide' : 'serverSide');

    // Use our default grid options first, override the defaults with
    // provided grid options, and then add callbacks
    this.mergedGridOptions = {
      rowModelType: this.rowModelType(),
      ...defaultGridOptions,
      defaultColDef: {
        ...defaultGridOptions.defaultColDef,
        filter: this.rowModelType() === 'clientSide' ? 'agMultiColumnFilter' : null,
      },
      ...this.gridOptions(),
      ...this.getCallbacksGridOptions(),
    };

    // This has to be set *after* the rowModelType is set (which we do in the previous call)
    this.gridVisible.set(true);
  }

  /** Called when a row is hovered. Used to track row ID. */
  public onCellMouseOver(event: CellMouseOverEvent) {
    this.lastRowHovered = event?.data?.id;
  }

  /** Called when a cell changes. Persists changes via backend and manages undo. */
  public async onCellValueChanged(event: CellValueChangedEvent<Partial<T>>) {
    const key = event.colDef.field as keyof T;
    const row = event.data as Partial<T> & { id: string };

    if (this.shouldBlockEdit(row, key)) {
      this.undoMgr.undo();
      return this.alertSvc.showError('This cell cannot be edited or deleted.');
    }

    const payload = this.createPayload(row, key);
    const edited = await this.applyEdit(row.id, payload);

    if (!edited) {
      this.undoMgr.undo();
      return this.alertSvc.showError('Could not edit the row. Please try again later.');
    }

    this.api?.flashCells({ rowNodes: [event.node], columns: [event.column] });
    this.undoMgr.updateSizes();
  }

  /** Called by AG Grid when ready. Sets up API, columns, and triggers refresh. */
  public onGridReady(params: GridReadyEvent) {
    this.colDefsWithEdit = [...this.colDefsWithEdit, ...this.colDefs()];
    this.api = params.api;

    if (this.rowModelType() === 'serverSide')
      this.api?.setGridOption('serverSideDatasource', this.createServerSideDatasource());

    this.undoMgr.initialize(this.api);
    this.refresh();
  }

  /** Called when selection changes. Updates selected state. */
  public onSelectionChanged() {
    this.isRowSelected.set(this.getSelectedRows().length > 0);
  }

  /** Opens edit form for row. */
  public openEdit(id: string) {
    return this.view(id);
  }

  /** Cancels the fetch call and hides loader. */
  public sendAbort() {
    this.gridSvc.abort();
    this.api?.hideOverlay();
  }

  /** Navigates to view route for given ID or last hovered ID. */
  public view(id?: string) {
    if (id) return this.navigateIfValid(id);
    if (!this.disableView()) this.navigateIfValid(this.lastRowHovered);
  }

  /** Navigates to add route. */
  protected add() {
    this.navigateIfValid(this.addRoute());
  }

  /** Warn about export scope, then export */
  protected async confirmExport(): Promise<void> {
    const ok = await this.dialogs.confirm({
      title: 'Export limitation',
      message:
        'This only exports the columns visible in the grid. If you’d like to export everything, use the Export component from the sidebar.',
      variant: 'info',
      icon: 'arrow-down-tray',
      confirmText: 'Accept',
      cancelText: 'Cancel',
    });

    if (!ok) return;

    try {
      await this.exportToCSV();
    } catch (e) {
      console.error(e);
      this.alertSvc.showError('Export failed. Please try again.');
    }
  }

  /** Deletes selected rows and optionally shows undo snackbar. */
  protected async deleteSelectedRows() {
    const rows = this.getSelectedRows();
    console.log('Deleting rows:', rows);
    const deletableRows = this.getDeletableRows(rows);

    console.log('Deletable rows:', deletableRows);
    if (this.handleDeleteErrors(rows, deletableRows)) return;

    this.api?.setGridOption('loading', true);
    try {
      const ids = deletableRows.map((row) => row.id);
      console.log('Deleting IDs:', ids);
      const deleted = await this.gridSvc.deleteMany(ids);

      if (!deleted) {
        this.alertSvc.showError('Could not delete. Please try again later.');
      } else {
        this.api?.applyTransaction({ remove: deletableRows });
        this.showUndoSuccess();
      }
    } finally {
      this.api?.setGridOption('loading', false);
    }
  }

  /** Triggers the import CSV flow (placeholder only). */
  protected doImportCSV() {
    this.importCSV.emit('');
  }

  /** Actually performs export via AG Grid. */
  protected exportToCSV() {
    this.api?.exportDataAsCsv();
  }

  protected filter() {
    if (this.api?.isSideBarVisible()) {
      this.api?.setSideBarVisible(false);
    } else {
      this.api?.setSideBarVisible(true);
      this.api?.openToolPanel('filters-new');
    }
  }

  /** Utility: sets ID for each row */
  protected getRowId(row: GetRowIdParams) {
    return row.data.id;
  }

  /** Utility: returns selected rows from grid */
  protected getSelectedRows() {
    return this.api?.getSelectedRows() as (Partial<T> & { id: string })[];
  }

  /** Utility: returns AG Grid theme class */
  protected getTheme() {
    return this.themeSvc.getTheme() === 'light' ? themeQuartz : themeQuartz.withPart(colorSchemeDarkBlue);
  }

  /** Called when row is double-clicked. */
  protected openEditOnDoubleClick(event: CellDoubleClickedEvent) {
    this.openEdit(event.data.id);
  }

  /** Triggers a full grid refresh via backend. */
  protected async refresh(): Promise<void> {
    try {
      this.api?.setGridOption('loading', true);
      if (this.rowModelType() === 'clientSide') {
        const rowData = await this.gridSvc.getAll({ tags: this.limitToTags() });
        this.api?.setGridOption('rowData', rowData.rows as Partial<T>[]);
      } else {
        this.api?.refreshServerSide({ purge: true });
      }
    } catch (error) {
      this.alertSvc.showError('Could not load the data. Please try again later.');
    } finally {
      this.api?.setGridOption('loading', false);
    }
  }

  /** Compares two tag arrays */
  protected tagArrayEquals(tagsA: string[], tagsB: string[]): number {
    return tagsA?.toString().localeCompare(tagsB?.toString());
  }

  /** Turns tag array into string */
  protected tagsToString(tags: string[]): string {
    return !tags || !tags[0] ? '' : tags.toString();
  }

  /** Undoes a delete (not implemented yet). */
  protected async undoDeleteRows() {
    // Placeholder
  }

  /** Helper: applies single-field patch */
  private async applyEdit(id: string, data: Partial<T>): Promise<boolean> {
    return this.gridSvc
      .update(id, data as U)
      .then(() => true)
      .catch(() => false);
  }

  /** Helper: returns single-field payload from row */
  private createPayload(row: Partial<T>, key: keyof T): Partial<T> {
    return row[key] !== undefined ? ({ [key]: row[key] } as Partial<T>) : {};
  }

  /** Internal helper: merges base and input grid options */
  private getCallbacksGridOptions(): GridOptions<Partial<T>> {
    return {
      context: this,
      onCellValueChanged: this.onCellValueChanged.bind(this),
      onCellMouseOver: this.onCellMouseOver.bind(this),
      onSelectionChanged: this.onSelectionChanged.bind(this),
      onUndoEnded: this.updateUndoSizes,
      onRedoEnded: this.updateUndoSizes,
      onRowDataUpdated: this.updateUndoSizes,
      onRowValueChanged: this.updateUndoSizes,
    } as GridOptions<Partial<T>>;
  }

  /** Helper: filters rows eligible for deletion */
  private getDeletableRows(rows: (Partial<T> & { id: string })[]): (Partial<T> & { id: string })[] {
    return rows.filter((row) => !('deletable' in row) || row.deletable !== false);
  }

  /** Helper: checks deletion rules and shows errors */
  private handleDeleteErrors(rows: Partial<T>[], deletableRows: Partial<T>[]) {
    if (!rows.length) {
      this.alertSvc.showError('Please select at least one row to delete.');
      return true;
    }
    if (deletableRows.length !== rows.length) {
      this.alertSvc.showError('Some rows cannot be deleted because these are system values.');
    }
    return deletableRows.length === 0;
  }

  /** Navigates to route if valid */
  private navigateIfValid(path: string | null | undefined): void {
    if (path) this.router.navigate([path], { relativeTo: this.route });
  }

  /** Helper: prevents editing specific fields */
  private shouldBlockEdit(row: Partial<T>, key: keyof T): boolean {
    return 'deletable' in row && row.deletable === false && key === 'name';
  }

  /** Internal helper: shows undo snackbar after delete */
  private showUndoSuccess() {
    this.alertSvc.show({
      text: 'Deleted successfully. Click Undo to undo delete',
      type: 'success',
      OKBtn: 'Undo',
      duration: 3500,
      OKBtnCallback: () => this.undoDeleteRows(),
    });
  }
}
