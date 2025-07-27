import { AgGridModule } from '@ag-grid-community/angular';
import {
  CellDoubleClickedEvent,
  CellMouseOverEvent,
  CellValueChangedEvent,
  ColDef,
  GetRowIdParams,
  GridApi,
  GridOptions,
  GridReadyEvent,
} from '@ag-grid-community/core';
import { Component, EventEmitter, Output, effect, inject, input, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AlertService } from '@uxcommon/alert-service';
import { Icon } from '@uxcommon/icon';
import { IconName } from '@uxcommon/svg-icons-list';

import { AbstractAPIService } from '../../abstract.service';

import { SearchService } from 'apps/frontend/src/app/data/search-service';
import { ThemeService } from 'apps/frontend/src/app/layout/theme-service';
import { Models } from 'common/src/lib/kysely.models';
import { UndoManager } from './undo-redo-mgr';
import { defaultGridOptions, SELECTION_COLUMN } from './grid-defaults';

@Component({
  selector: 'pc-datagrid',
  imports: [AgGridModule, Icon],
  templateUrl: './datagrid.html',
})
export class DataGrid<T extends keyof Models, U> {
  // Injected Services
  protected readonly alertSvc = inject(AlertService);
  protected readonly gridSvc = inject<AbstractAPIService<T, U>>(AbstractAPIService);
  protected readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly searchSvc = inject(SearchService);
  private readonly themeSvc = inject(ThemeService);

  // State & UI Signals
  protected readonly isRowSelected = signal(false);
  protected readonly processing = signal(false);
  protected readonly undoMgr = new UndoManager();
  private readonly updateUndoSizes = this.undoMgr.updateSizes.bind(this.undoMgr);

  // AG Grid
  protected api: GridApi<Partial<T>> | undefined;

  protected colDefsWithEdit: ColDef[] = [SELECTION_COLUMN];

  // Other State
  private lastRowHovered: string | undefined;
  protected readonly distinctTags: string[] = [];

  // Inputs & Outputs
  public addRoute = input<string | null>(null);
  public colDefs = input<ColDef[]>([]);
  public disableDelete = input<boolean>(true);
  public disableExport = input<boolean>(false);
  public disableImport = input<boolean>(true);
  public disableRefresh = input<boolean>(false);
  public disableView = input<boolean>(true);
  public gridOptions = input<GridOptions<Partial<T>>>({});
  public limitToTags = input<string[]>([]);
  public plusIcon = input<IconName>('plus');
  @Output() public filter = new EventEmitter();
  @Output() public importCSV = new EventEmitter<string>();

  constructor() {
    effect(() => {
      const quickFilterText = this.searchSvc.search;
      this.api?.updateGridOptions({ quickFilterText });
    });
  }

  /** Called by AG Grid when ready. Sets up API, columns, and triggers refresh. */
  public onGridReady(params: GridReadyEvent) {
    this.colDefsWithEdit = [...this.colDefsWithEdit, ...this.colDefs()];
    this.api = params.api;
    this.undoMgr.initialize(this.api);
    this.api.updateGridOptions(this.getMergedGridOptions());
    this.refresh();
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

    this.api?.flashCells({ rowNodes: [event.node!], columns: [event.column] });
    this.undoMgr.updateSizes();
  }

  /** Called when a row is hovered. Used to track row ID. */
  public onCellMouseOver(event: CellMouseOverEvent) {
    this.lastRowHovered = event?.data?.id;
  }

  /** Called when selection changes. Updates selected state. */
  public onSelectionChanged() {
    this.isRowSelected.set(this.getSelectedRows().length > 0);
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

  /** Opens edit form for row. */
  public openEdit(id: string) {
    return this.view(id);
  }

  /** Called when row is double-clicked. */
  protected openEditOnDoubleClick(event: CellDoubleClickedEvent) {
    this.openEdit(event.data.id);
  }

  /** Triggers a full grid refresh via backend. */
  protected async refresh(): Promise<void> {
    try {
      this.api!.setGridOption('loading', true);
      const rows = (await this.gridSvc.getAll({ tags: this.limitToTags() })) as Partial<T>[];
      this.api!.setGridOption('rowData', rows);
    } catch (error) {
      this.alertSvc.showError('Could not load the data. Please try again later.');
    } finally {
      this.api!.setGridOption('loading', false);
    }
  }

  /** Confirms deletion with modal. */
  public confirmDelete(): void {
    if (this.disableDelete()) {
      return this.alertSvc.showError('You do not have the permission to delete rows from this table.');
    }

    this.showDialogById('confirmDelete');
  }

  /** Deletes selected rows and optionally shows undo snackbar. */
  protected async deleteSelectedRows() {
    const rows = this.getSelectedRows();
    const deletableRows = this.getDeletableRows(rows);
    if (this.handleDeleteErrors(rows, deletableRows)) return;

    this.processing.set(true);
    try {
      const ids = deletableRows.map((row) => row.id);
      const deleted = await this.gridSvc.deleteMany(ids);

      if (!deleted) {
        this.alertSvc.showError('Could not delete. Please try again later.');
      } else {
        this.api!.applyTransaction({ remove: deletableRows });
        this.showUndoSuccess();
      }
    } finally {
      this.processing.set(false);
    }
  }

  /** Confirms export with modal. */
  protected confirmExport(): void {
    this.showDialogById('confirmExport');
  }

  /** Actually performs export via AG Grid. */
  protected exportToCSV() {
    this.api!.exportDataAsCsv();
  }

  /** Triggers the import CSV flow (placeholder only). */
  protected doImportCSV() {
    this.importCSV.emit('');
  }

  /** Cancels the fetch call and hides loader. */
  public sendAbort() {
    this.gridSvc.abort();
    this.api!.hideOverlay();
  }

  /** Undo and redo call through the manager */
  public undo() {
    this.undoMgr.undo();
  }

  public redo() {
    this.undoMgr.redo();
  }

  /** Undoes a delete (not implemented yet). */
  protected async undoDeleteRows() {
    // Placeholder
  }

  /** Utility: returns selected rows from grid */
  protected getSelectedRows() {
    return this.api?.getSelectedRows() as (Partial<T> & { id: string })[];
  }

  /** Utility: sets ID for each row */
  protected getRowId(row: GetRowIdParams) {
    return row.data.id;
  }

  /** Utility: returns AG Grid theme class */
  protected getTheme() {
    return this.themeSvc.theme === 'light' ? 'ag-theme-quartz' : 'ag-theme-quartz-dark';
  }

  /** Compares two tag arrays */
  protected tagArrayEquals(tagsA: string[], tagsB: string[]): number {
    return tagsA?.toString().localeCompare(tagsB?.toString());
  }

  /** Turns tag array into string */
  protected tagsToString(tags: string[]): string {
    return !tags || !tags[0] ? '' : tags.toString();
  }

  /** Internal helper for showing modals */
  protected showDialogById(id: string): void {
    const dialog = document.querySelector<HTMLDialogElement>(`#${id}`);
    dialog?.showModal();
  }

  protected defaultGridOptions() {
    return defaultGridOptions as GridOptions<Partial<T>>;
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

  /** Internal helper: merges base and input grid options */
  private getMergedGridOptions(): GridOptions<Partial<T>> {
    return {
      context: this,
      ...defaultGridOptions,
      ...this.gridOptions(),
      onCellValueChanged: this.onCellValueChanged.bind(this),
      onCellMouseOver: this.onCellMouseOver.bind(this),
      onSelectionChanged: this.onSelectionChanged.bind(this),
      onUndoEnded: this.updateUndoSizes,
      onRedoEnded: this.updateUndoSizes,
      onRowDataUpdated: this.updateUndoSizes,
      onRowValueChanged: this.updateUndoSizes,
    } as GridOptions<Partial<T>>;
  }

  /** Navigates to route if valid */
  private navigateIfValid(path: string | null | undefined): void {
    if (path) this.router.navigate([path], { relativeTo: this.route });
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

  /** Helper: prevents editing specific fields */
  private shouldBlockEdit(row: Partial<T>, key: keyof T): boolean {
    return 'deletable' in row && row.deletable === false && key === 'name';
  }
}
