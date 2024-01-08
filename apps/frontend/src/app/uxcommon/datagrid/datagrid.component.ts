import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, effect } from '@angular/core';
import { Router } from '@angular/router';
import { AlertService } from '@services/alert.service';
import { BaseGridService } from '@services/base-grid.service';
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
  RowDataUpdatedEvent,
  RowValueChangedEvent,
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
export class DatagridComponent<T extends keyof Models, U> {
  @Input() public addRoute: string | null = null;
  @Input() public colDefs: ColDef[] = [];
  @Input() public disableDelete = true;
  @Input() public disableExport = false;
  @Input() public disableFilter = false;
  @Input() public disableImport = false;
  @Input() public disableRefresh = false;
  @Output() public filter = new EventEmitter();
  @Output() public importCSV = new EventEmitter();

  protected _gridOptions: GridOptions<Partial<T>> = {};
  protected _gridRowData: Partial<T>[] = [];
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
  protected api: GridApi<Partial<T>> | undefined;
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
    ...this._gridOptions,
  };
  protected processing = false;

  constructor(
    private router: Router,
    private themeSvc: ThemeService,
    private serachSvc: SearchService,
    private alertSvc: AlertService,
    protected gridSvc: BaseGridService<T, U>,
  ) {
    effect(() => {
      const quickFilterText = this.serachSvc.search;
      this.api?.updateGridOptions({ quickFilterText });
    });
  }

  public confirmDelete() {
    if (this.disableDelete) {
      return this.alertSvc.showError(
        'You do not have the permission to delete rows from this table.',
      );
    }

    const dialog = document.querySelector('#confirmDelete') as HTMLDialogElement;
    dialog.showModal();
  }

  public confirmExport() {
    const dialog = document.querySelector('#confirmExport') as HTMLDialogElement;
    dialog.showModal();
  }

  public async edit(id: number, data: Partial<T>) {
    return await this.gridSvc
      .update(id, data as U)
      .then(() => true)
      .catch(() => false);
  }

  public getTheme() {
    return this.themeSvc.theme === 'light' ? 'ag-theme-quartz' : 'ag-theme-quartz-dark';
  }

  public async onCellValueChanged(event: CellValueChangedEvent<Partial<T>>) {
    const key = event.colDef.field as keyof T;
    const row = event.data as Partial<T> & { id: number };
    const payload = this.createPayload(row, key);

    this.processing = true;
    const edited = await this.edit(Number(row.id), payload);
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

  public onGridReady(params: GridReadyEvent) {
    this.colDefsWithEdit = [...this.colDefsWithEdit, ...this.colDefs];
    this.api = params.api;
    this.refresh();
  }

  public onRedoEnded(/*event: RedoEndedEvent*/) {
    //console.log("redoEnded", event);
  }

  public onRedoStarted(/*event: RedoStartedEvent*/) {
    //console.log("redoStarted", event);
  }

  public onRowDataUpdated(event: RowDataUpdatedEvent) {
    console.log(event);
  }

  public onRowValueChanged(event: RowValueChangedEvent) {
    console.log('***', event);
  }

  public onUndoEnded(/*event: UndoEndedEvent*/) {
    //console.log("undoEnded", event);
  }

  public onUndoStarted(/*event: UndoStartedEvent*/) {
    //console.log("undoStarted", event);
  }

  public open() {
    console.log('opening');
  }

  public redo() {
    this.api?.getCurrentRedoSize() && this.api?.redoCellEditing();
  }

  public sendAbort() {
    this.abortRefresh();
    this.api!.hideOverlay();
  }

  public undo() {
    this.api?.getCurrentUndoSize() && this.api?.undoCellEditing();
  }

  protected abortRefresh() {
    this.gridSvc.abort();
  }

  protected add() {
    this.addRoute && this.router.navigate([this.addRoute]);
  }

  protected applyFilter() {
    this.filter.emit();
  }

  protected async deleteSelectedRows() {
    const rows = this.api?.getSelectedRows() as (Partial<T> & { id: number })[];
    if (!rows?.length) {
      return this.alertSvc.showError('Please select at least one row to delete.');
    }

    this.processing = true;

    const ids = rows.map((row) => Number(row.id));

    //TODO: use deleteMany
    const deleted = this.gridSvc.delete(ids[0]);
    // const deleted = this.gridSvc.deleteMany(ids);

    if (!deleted) {
      this.alertSvc.showError('Could not delete. Please try again later.');
    } else {
      this.api?.applyTransaction({ remove: rows });
      rows.forEach((row) => this._gridRowData.splice(row.id!, 1));
      // this.undoStack.push(...rows);
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
    this.importCSV.emit();
  }

  protected exportToCSV() {
    this.api!.exportDataAsCsv();
  }

  protected getRowId(row: GetRowIdParams) {
    return row.data.id;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected async refresh() {
    this.api!.showLoadingOverlay();

    const rows = (await this.gridSvc.refresh()) as Partial<T>[];

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

  private createPayload<T>(row: Partial<T>, key: keyof T): Partial<Pick<T, typeof key>> {
    const payload: Partial<Pick<T, typeof key>> = {};

    // Check if the key exists in the row and is not undefined
    if (key in row && row[key] !== undefined) {
      payload[key] = row[key];
    }

    return payload;
  }
}
