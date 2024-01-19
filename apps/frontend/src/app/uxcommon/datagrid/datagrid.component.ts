import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, effect } from '@angular/core';
import { Router } from '@angular/router';
import { AlertService } from '@services/alert.service';
import { AbstractBackendService } from '@services/backend/abstract.service';
import { SearchService } from '@services/search.service';
import { ThemeService } from '@services/theme.service';
import { IconsComponent } from '@uxcommon/icons/icons.component';
import { AgGridModule } from 'ag-grid-angular';
import {
  CellValueChangedEvent,
  ColDef,
  GetRowIdParams,
  GridApi,
  GridOptions,
  GridReadyEvent,
} from 'ag-grid-community';
import { Models } from 'common/src/lib/kysely.models';
import { LoadingOverlayComponent } from './overlay/loadingOverlay.component';
import { DeleteCellRendererComponent } from './shortcut-cell-renderer/shortcut-cell-renderer.component';

@Component({
  selector: 'pc-datagrid',
  standalone: true,
  imports: [CommonModule, AgGridModule, IconsComponent],
  templateUrl: './datagrid.component.html',
  styleUrl: './datagrid.component.scss',
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
export class DatagridComponent<T extends keyof Models, U> {
  /**
   * If given, we enable an "add" button that allows new rows to be added.
   * Clicking the button takes the user to the route given here.
   * The component in that route is responsible for adding.
   */
  @Input() public addRoute: string | null = null;
  /**
   * The list of columns to display in the grid. Without anything given,
   * the list of columns will be empty.
   */
  @Input() public colDefs: ColDef[] = [];
  /**
   * Whether delete should be enabled or disabled. Not all grids support
   * deleting of rows. The default is true, so by default delete is disabled.
   */
  @Input() public disableDelete = true;
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
  @Input() public disableExport = false;
  /**
   * Whether filter should be enabled or disabled. Not all grids support
   * filtering of rows. The default is false, so by default filter is enabled.
   */
  @Input() public disableFilter = false;
  /**
   * Whether import should be enabled or disabled. Not all grids support
   * importing of rows. The default is true, so by default import is disabled.
   */
  @Input() public disableImport = true;
  /**
   * Whether refresh should be enabled or disabled. Not all grids support
   * refreshing of rows. The default is false, so by default refresh is enabled.
   */
  @Input() public disableRefresh = false;
  /**
   * The event emitter that contains the list of filter that the user applied
   */
  @Output() public filter = new EventEmitter();
  /**
   * The lst of grid options to use or override.
   * @see https://www.ag-grid.com/javascript-grid-properties/
   */
  @Input() public gridOptions: GridOptions<Partial<T>> = {};
  /**
   * Emit the name of the CSV file that was imported by the user.
   */
  @Output() public importCSV = new EventEmitter<string>();

  protected _gridRowData: Partial<T>[] = [];
  /** The default options we start with. This can be overridden
   * by the parent component providing gridOptions.
   * @see gridOptions
   */
  protected _initialGridOptions: GridOptions<Partial<T>> = {
    context: this,
    rowStyle: { cursor: 'pointer' },
    undoRedoCellEditing: true,
    stopEditingWhenCellsLoseFocus: true,
    suppressCellFocus: true,
    enableCellChangeFlash: true,
    rowData: this._gridRowData,
    pagination: true,
    paginationAutoPageSize: true,
    rowSelection: 'multiple',
    animateRows: true,
    autoSizeStrategy: {
      type: 'fitGridWidth',
    },
    onCellValueChanged: this.onCellValueChanged.bind(this),
    onUndoStarted: this.onUndoStarted.bind(this),
    onUndoEnded: this.onUndoEnded.bind(this),
    onRedoStarted: this.onRedoStarted.bind(this),
    onRedoEnded: this.onRedoEnded.bind(this),
    onRowDataUpdated: this.onRowDataUpdated.bind(this),
    onRowValueChanged: this.onRowValueChanged.bind(this),
    loadingOverlayComponent: LoadingOverlayComponent,
  };
  /**
   * The AG Grid API that can be used to interact with the grid.
   */
  protected api: GridApi<Partial<T>> | undefined;
  /** This is the default column (or columns) every grid starts off with.
   * The parent component can extend this by providing colDefs.
   */
  protected colDefsWithEdit: ColDef[] = [
    /*
    {
      checkboxSelection: true,
      filter: false,
      sortable: false,
      resizable: false,
      maxWidth: 30,
      suppressCellFlash: true,
    },
    */
    {
      filter: false,
      sortable: false,
      cellClass: 'shortcut-cell',
      resizable: false,
      minWidth: 60,
      maxWidth: 60,
      cellRenderer: DeleteCellRendererComponent,
      suppressCellFlash: true,
    },
  ];
  protected combinedGridOptions: GridOptions<Partial<T>> = {
    ...this._initialGridOptions,
    ...this.gridOptions,
  };
  protected processing = false;

  constructor(
    private router: Router,
    private themeSvc: ThemeService,
    private serachSvc: SearchService,
    private alertSvc: AlertService,
    protected gridSvc: AbstractBackendService<T, U>,
  ) {
    /**
     * Whenever the search text changes, we update the grid options
     * and filter by the search string.
     *
     * This makes the search / filter global so as the user switches
     * grids, the search text is preserved and filters the new grid.
     */
    effect(() => {
      const quickFilterText = this.serachSvc.search;
      this.api?.updateGridOptions({ quickFilterText });
    });
  }

  /**
   * Delete is permanant, so warn the user before deleting.
   *
   */
  public confirmDelete(): void {
    if (this.disableDelete) {
      return this.alertSvc.showError(
        'You do not have the permission to delete rows from this table.',
      );
    }

    const dialog = document.querySelector('#confirmDelete') as HTMLDialogElement;
    dialog.showModal();
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
    const row = event.data as Partial<T> & { id: bigint };
    const payload = this.createPayload(row, key);

    this.processing = true;
    const edited = await this.edit(row.id, payload);
    if (!edited) {
      this.alertSvc.showError('Could not edit the row. Please try again later.');
      this.undo();
    } else {
      this.api?.flashCells({
        rowNodes: [event.node!],
        columns: [event.column],
      });
    }
    this.processing = false;
  }

  /**
   * Caled by AG Grid when the grid is ready. Thsi is when we set the grid API
   * as well as columns.
   *
   * We also refresh the grid to load the data.
   *
   */
  public onGridReady(params: GridReadyEvent) {
    this.colDefsWithEdit = [...this.colDefsWithEdit, ...this.colDefs];
    this.api = params.api;
    this.refresh();
  }

  public onRedoEnded(/*event: RedoEndedEvent*/) {}

  public onRedoStarted(/*event: RedoStartedEvent*/) {}

  public onRowDataUpdated(/*event: RowDataUpdatedEvent*/) {}

  public onRowValueChanged(/*event: RowValueChangedEvent*/) {}

  public onUndoEnded(/*event: UndoEndedEvent*/) {
    //console.log("undoEnded", event);
  }

  public onUndoStarted(/*event: UndoStartedEvent*/) {
    //console.log("undoStarted", event);
  }

  /**
   * Called when the user clicks the row. We route to the component that
   * opens the row.
   */
  public open() {
    console.log('opening');
  }

  /**
   * Redo the operation that was undone.
   */
  public redo() {
    this.api?.getCurrentRedoSize() && this.api?.redoCellEditing();
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
    this.api?.getCurrentUndoSize() && this.api?.undoCellEditing();
  }

  /**
   * If an addRoute is given then go there to add a new row.
   */
  protected add() {
    this.addRoute && this.router.navigate([this.addRoute]);
  }

  /**
   * Export only exports the columns that are currently loaded in the grid, and
   * not the entire backend database table. We first confirm that's what the
   * user intends to do.
   */
  protected confirmExport(): void {
    const dialog = document.querySelector('#confirmExport') as HTMLDialogElement;
    dialog.showModal();
  }

  /**
   * Delete the selected rows.
   * There is no undo as it is called by the confirm delete dialog.
   *
   */
  protected async deleteSelectedRows() {
    const rows = this.api?.getSelectedRows() as (Partial<T> & { id: bigint })[];
    if (!rows?.length) {
      return this.alertSvc.showError('Please select at least one row to delete.');
    }

    this.processing = true;

    const ids = rows.map((row) => row.id);

    //TODO: use deleteMany
    const deleted = this.gridSvc.delete(ids[0]);
    // const deleted = this.gridSvc.deleteMany(ids);

    if (!deleted) {
      this.alertSvc.showError('Could not delete. Please try again later.');
    } else {
      this.api?.applyTransaction({ remove: rows });

      // We will never load more rows than the number can handle, so we don't need bigint here
      rows.forEach((row) => this._gridRowData.splice(Number(row.id!), 1));

      this.alertSvc.show({
        text: 'Deleted successfully. Click Undo to undo delete',
        type: 'success',
        OKBtn: 'Undo',
        duration: 3500,
        OKBtnCallback: () => this.undoDeleteRows(),
      });
    }
    this.processing = false;
  }

  protected doImportCSV() {
    // upload the file to storage
    // pass the link to emit
    this.importCSV.emit('');
  }

  protected exportToCSV() {
    this.api!.exportDataAsCsv();
  }

  /**
   * Apply the label filter and emit the filter event.
   */
  protected filterByTag() {
    this.filter.emit();
  }

  protected getRowId(row: GetRowIdParams) {
    return row.data.id;
  }

  /**
   *
   * @returns The theme to use for the grid
   */
  protected getTheme() {
    return this.themeSvc.theme === 'light' ? 'ag-theme-quartz' : 'ag-theme-quartz-dark';
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected async refresh() {
    this.api!.showLoadingOverlay();

    const rows = (await this.gridSvc.getAll()) as Partial<T>[];

    // Set the grid option because it works around Angular's
    // ValueChangedAterChecked error
    this.api!.setGridOption('rowData', this._gridRowData);
    this.api!.applyTransaction({ add: rows });
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
  private createPayload<T>(row: Partial<T>, key: keyof T): Partial<Pick<T, typeof key>> {
    const payload: Partial<Pick<T, typeof key>> = {};

    // Check if the key exists in the row and is not undefined
    if (key in row && row[key] !== undefined) {
      payload[key] = row[key];
    }

    return payload;
  }

  /**
   * Apply the edits the user did on the grid. This is done by calling the
   * backend service to update the row in the database.
   *
   * @param id
   * @param data
   * @returns Boolean indicating whether the edit was successful or not
   */
  private async edit(id: bigint, data: Partial<T>): Promise<boolean> {
    return this.gridSvc
      .update(id, data as U)
      .then(() => true)
      .catch(() => false);
  }
}
