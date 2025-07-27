// tsco:ignore
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
import { LoadingOverlayComponent } from '../loading-overlay';
import { ShortcutCellRenderer } from '../shortcut-cell-renderer';
import { SearchService } from 'apps/frontend/src/app/data/search-service';
import { ThemeService } from 'apps/frontend/src/app/layout/theme-service';
import { Models } from 'common/src/lib/kysely.models';
import { UndoManager } from './undo-redo-mgr';
import { BASE_GRID_CONFIG } from './grid-defaults';

const SELECTION_COLUMN: ColDef = {
  checkboxSelection: true,
  filter: false,
  sortable: false,
  cellClass: 'pl-1 pr-0 w-auto',
  resizable: false,
  suppressCellFlash: true,
  lockVisible: true,
  lockPosition: true,
  suppressMovable: true,
  suppressMenu: true,
  pinned: 'left',
  lockPinned: true,
  cellRenderer: ShortcutCellRenderer,
};

@Component({
  selector: 'pc-datagrid',
  imports: [AgGridModule, Icon],
  templateUrl: './datagrid.html',
})

/**
 * The base datagrid component that can be used to display a list of items.
 * This allows derived classes to simply define the default list of
 * columns and the backend service to use.
 *
 * @example
 * Example: the following class is all that's needed to display a list of tags
 * with three columns: name, description and count. Note that it uses the
 * TagsBackendService to pass into the constructor.
 *
 * Tags typescript:
 * class TagsGridComponent extends DatagridComponent<'tags', AddTagType> {
 * protected col = [
 *   { field: 'name', headerName: 'Tag Name', editable: true },
 *   { field: 'description', headerName: 'Description', editable: true },
 *   { field: 'count', headerName: 'Times Used', editable: true },
 * ];
 *
 *  constructor(
 *    router: Router,
 *    themeSvc: ThemeService,
 *    serachSvc: SearchService,
 *    alertSvc: AlertService,
 *    gridSvc: TagsBackendService,
 * ) {
 *    super(router, themeSvc, serachSvc, alertSvc, gridSvc);
 * }
 *
 * Tempate:
 * <pc-datagrid [colDefs]="col" [disableDelete]="false"></pc-datagrid>

 */
// TODO: these are not the correct generics
export class DataGrid<T extends keyof Models, U> {
  private lastRowHovered: string | undefined;
  private route = inject(ActivatedRoute);
  private searchSvc = inject(SearchService);
  private themeSvc = inject(ThemeService);

  protected readonly isRowSelected = signal(false);
  protected readonly undoMgr = new UndoManager();
  private readonly updateUndoSizes = this.undoMgr.updateSizes.bind(this.undoMgr);

  protected alertSvc = inject(AlertService);

  /**
   * The AG Grid API that can be used to interact with the grid.
   */
  protected api: GridApi<Partial<T>> | undefined;

  /** This is the default column (or columns) every grid starts off with.
   * The parent component can extend this by providing colDefs.
   */
  protected colDefsWithEdit: ColDef[] = [SELECTION_COLUMN];

  /** The default options we start with. This can be overridden
   * by the parent component providing gridOptions.
   * @see gridOptions
   */
  protected defaultGridOptions: GridOptions<Partial<T>> = {
    animateRows: true,
    autoSizeStrategy: { type: 'fitCellContents' },
    context: this,
    defaultColDef: BASE_GRID_CONFIG.defaultColDef,
    initialState: BASE_GRID_CONFIG.initialState,
    sideBar: BASE_GRID_CONFIG.sideBar,
    enableCellChangeFlash: true,
    enableRangeSelection: true,
    copyHeadersToClipboard: true,
    enableCellEditingOnBackspace: true,
    pagination: true,
    paginationAutoPageSize: true,
    rowSelection: 'multiple',
    rowStyle: { cursor: 'pointer' },
    stopEditingWhenCellsLoseFocus: true,
    undoRedoCellEditing: true,
    loadingOverlayComponent: LoadingOverlayComponent,
  };

  protected distinctTags: string[] = [];
  protected gridSvc = inject<AbstractAPIService<T, U>>(AbstractAPIService);
  protected processing = signal(false);
  protected router = inject(Router);

  /**
   * If given, we enable an "add" button that allows new rows to be added.
   * Clicking the button takes the user to the route given here.
   * The component in that route is responsible for adding.
   */
  public addRoute = input<string | null>(null);

  /**
   * The list of columns to display in the grid. Without anything given,
   * the list of columns will be empty.
   */
  public colDefs = input<ColDef[]>([]);

  /**
   * Whether delete should be enabled or disabled. Not all grids support
   * deleting of rows. The default is true, so by default delete is disabled.
   */
  public disableDelete = input<boolean>(true);

  /**
   * Whether export should be enabled or disabled. Not all grids support
   * exporting of rows. The default is false, so by default export is enabled.
   * The export is done based on the columns that are loaded in the grid.
   *
   * So if the grid is showing only a subset of the columns, then only those
   * columns will be exported.
   *
   * Also if the grid shows columns from multiple tables, then the export
   * will be done based on the columns from those tables.
   */
  public disableExport = input<boolean>(false);

  /**
   * Whether import should be enabled or disabled. Not all grids support
   * importing of rows. The default is true, so by default import is disabled.
   */
  public disableImport = input<boolean>(true);

  /**
   * Whether refresh should be enabled or disabled. Not all grids support
   * refreshing of rows. The default is false, so by default refresh is enabled.
   */
  public disableRefresh = input<boolean>(false);

  /**
   * Whether the view route is disabled or not.
   *
   * Default: true
   */
  public disableView = input<boolean>(true);

  /**
   * The event emitter that contains the list of filter that the user applied
   */
  @Output() public filter = new EventEmitter();

  /**
   * The lst of grid options to use or override.
   * @see https://www.ag-grid.com/javascript-grid-properties/
   */
  public gridOptions = input<GridOptions<Partial<T>>>({});

  /**
   * Emit the name of the CSV file that was imported by the user.
   */
  @Output() public importCSV = new EventEmitter<string>();

  /**
   * The list of tags to limit the grid to.
   */
  public limitToTags = input<string[]>([]);
  public plusIcon = input<IconName>('plus');

  private getDeletableRows(rows: (Partial<T> & { id: string })[]): (Partial<T> & { id: string })[] {
    return rows.filter((row) => !('deletable' in row) || row.deletable !== false);
  }

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

  protected showDialogById(id: string): void {
    const dialog = document.querySelector<HTMLDialogElement>(`#${id}`);
    dialog?.showModal();
  }

  /**
   * Delete is permanant, so warn the user before deleting.
   *
   */
  public confirmDelete(): void {
    if (this.disableDelete()) {
      return this.alertSvc.showError('You do not have the permission to delete rows from this table.');
    }

    this.showDialogById('confirmDelete');
  }

  public onCellMouseOver(event: CellMouseOverEvent) {
    this.lastRowHovered = event?.data?.id;
  }

  public onSelectionChanged(/* */) {
    this.isRowSelected.set(this.getSelectedRows().length > 0);
  }

  /**
   * Handle the cell value changed event.
   *
   * This is called by AG Grid when the user edits a cell.
   *
   * We call the backend service to update the row in the database. If the edit
   * was successful then we flash the cell to indicate success. Otherwise we
   * show an error message and undo the edit.
   *
   * @param event
   */
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
      // TODO: we can't just blindly undo. What if it failed on undo? In that case we have to redo
      this.undoMgr.undo();
      return this.alertSvc.showError('Could not edit the row. Please try again later.');
    }

    this.api?.flashCells({ rowNodes: [event.node!], columns: [event.column] });

    this.undoMgr.updateSizes();
  }

  /**
   * Caled by AG Grid when the grid is ready. Thsi is when we set the grid API
   * as well as columns.
   *
   * We also refresh the grid to load the data.
   *
   */
  public onGridReady(params: GridReadyEvent) {
    this.colDefsWithEdit = [...this.colDefsWithEdit, ...this.colDefs()];
    this.api = params.api;
    this.undoMgr.initialize(this.api);

    this.api.updateGridOptions(this.getMergedGridOptions());

    this.refresh();
  }

  public openEdit(id: string) {
    return this.view(id);
  }

  /**
   * Redo the operation that was undone.
   */
  public redo() {
    this.undoMgr.redo();
  }

  /**
   * Abort the refresh of the grid. This is called when the user clicks
   * cancel on the loading overlay.
   */
  public sendAbort() {
    this.gridSvc.abort();
    this.api!.hideOverlay();
  }

  /**
   * Undo the operation that was done.
   */
  public undo() {
    this.undoMgr.undo();
  }

  private navigateIfValid(path: string | null | undefined): void {
    if (path) {
      this.router.navigate([path], { relativeTo: this.route });
    }
  }

  /**
   * If a view is not disabled then go there to view the row.
   */
  public view(id?: string) {
    if (id) return this.navigateIfValid(id);
    if (!this.disableView()) this.navigateIfValid(this.lastRowHovered);
  }

  /**
   * If an addRoute is given then go there to add a new row.
   */
  protected add() {
    this.navigateIfValid(this.addRoute());
  }

  /**
   * Export only exports the columns that are currently loaded in the grid, and
   * not the entire backend database table. We first confirm that's what the
   * user intends to do.
   */
  protected confirmExport(): void {
    this.showDialogById('confirmExport');
  }

  private getMergedGridOptions(): GridOptions<Partial<T>> {
    return {
      ...this.defaultGridOptions,
      ...this.gridOptions(),
      onCellValueChanged: this.onCellValueChanged.bind(this),
      onCellMouseOver: this.onCellMouseOver.bind(this),
      onSelectionChanged: this.onSelectionChanged.bind(this),
      onUndoEnded: this.updateUndoSizes,
      onRedoEnded: this.updateUndoSizes,
      onRowDataUpdated: this.updateUndoSizes,
      onRowValueChanged: this.updateUndoSizes,
    };
  }

  /**
   * Delete the selected rows.
   * There is no undo as it is called by the confirm delete dialog.
   *
   */
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

  constructor() {
    /**
     * Whenever the search text changes, we update the grid options
     * and filter by the search string.
     *
     * This makes the search / filter global so as the user switches
     * grids, the search text is preserved and filters the new grid.
     */
    effect(() => {
      const quickFilterText = this.searchSvc.search;
      this.api?.updateGridOptions({ quickFilterText });
    });
  }

  private showUndoSuccess() {
    this.alertSvc.show({
      text: 'Deleted successfully. Click Undo to undo delete',
      type: 'success',
      OKBtn: 'Undo',
      duration: 3500,
      OKBtnCallback: () => this.undoDeleteRows(),
    });
  }

  protected doImportCSV() {
    // upload the file to storage
    // pass the link to emit
    this.importCSV.emit('');
  }

  protected exportToCSV() {
    this.api!.exportDataAsCsv();
  }

  protected getRowId(row: GetRowIdParams) {
    return row.data.id;
  }

  protected getSelectedRows() {
    return this.api?.getSelectedRows() as (Partial<T> & { id: string })[];
  }

  /**
   *
   * @returns The theme to use for the grid
   */
  protected getTheme() {
    return this.themeSvc.theme === 'light' ? 'ag-theme-quartz' : 'ag-theme-quartz-dark';
  }

  protected openEditOnDoubleClick(event: CellDoubleClickedEvent) {
    this.openEdit(event.data.id);
  }

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

  protected tagArrayEquals(tagsA: string[], tagsB: string[]): number {
    return tagsA?.toString().localeCompare(tagsB?.toString());
  }

  protected tagsToString(tags: string[]): string {
    return !tags || !tags[0] ? '' : tags.toString();
  }

  protected async undoDeleteRows() {
    /*
    this.api?.applyTransaction({ add: this.undoStack });

    this.gridSvc.addMany(this.undoStack as U[]);
    this._rowData.push(...this.undoStack);
    this.undoStack = [];
    this.alertSvc.showSuccess("Undo successful");
    //this.api?.flashCells();
    */
  }

  /**
   * Apply the edits the user did on the grid. This is done by calling the
   * backend service to update the row in the database.
   *
   * @param id
   * @param data
   * @returns Boolean indicating whether the edit was successful or not
   */
  private async applyEdit(id: string, data: Partial<T>): Promise<boolean> {
    return this.gridSvc
      .update(id, data as U)
      .then(() => true)
      .catch(() => false);
  }

  /**
   * When the user edits a row, it might contain columns that we don't support
   * updating or editing.
   *
   * This takes the entire row the user touched and returns the subset of columns
   * that are supported.
   *
   * To understand how it works,
   * @see onCellValueChanged
   *
   * @param row
   * @param key
   * @returns
   */
  private createPayload(row: Partial<T>, key: keyof T): Partial<T> {
    return row[key] !== undefined ? ({ [key]: row[key] } as Partial<T>) : {};
  }

  private shouldBlockEdit(row: Partial<T>, key: keyof T): boolean {
    return 'deletable' in row && row.deletable === false && key === 'name';
  }
}
