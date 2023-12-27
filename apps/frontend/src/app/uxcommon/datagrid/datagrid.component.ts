import { CommonModule } from "@angular/common";
import { Component, EventEmitter, Input, Output, effect } from "@angular/core";
import { AlertService } from "@services/alert.service";
import { SearchService } from "@services/search.service";
import { ThemeService } from "@services/theme.service";
import { IconsComponent } from "@uxcommon/icons/icons.component";
import { AgGridModule } from "ag-grid-angular";
import {
  CellMouseOverEvent,
  CellValueChangedEvent,
  ColDef,
  GridApi,
  GridOptions,
  GridReadyEvent,
  RedoStartedEvent,
  UndoStartedEvent,
} from "ag-grid-community";
import { EditCellRendererComponent } from "./edit-cell-renderer/edit-cell-renderer.component";
import { LoadingOverlayComponent } from "./overlay/loadingOverlay.component";

@Component({
  selector: "pc-datagrid",
  standalone: true,
  imports: [CommonModule, AgGridModule, IconsComponent],
  templateUrl: "./datagrid.component.html",
  styleUrl: "./datagrid.component.scss",
})
export class DatagridComponent<T> {
  protected api: GridApi<Partial<T>> | undefined;

  @Input({ required: true }) colDefs: ColDef[] = [];
  @Input({ required: true }) rowData: Partial<T>[] = [];
  @Input() gridOptions: GridOptions<Partial<T>> = {};

  @Input() disableAdd = false;
  @Input() disableRefresh = false;
  @Input() disableImport = false;
  @Input() disableExport = false;
  @Input() disableFilter = false;
  @Input() disableEdit = false;
  @Input() disableDelete = false;

  @Output() refresh = new EventEmitter<{ forced: boolean }>();
  @Output() abortRefresh = new EventEmitter<void>();
  @Output() add = new EventEmitter();
  @Output() importCSV = new EventEmitter();
  @Output() filter = new EventEmitter();
  @Output() edit = new EventEmitter();
  @Output() delete = new EventEmitter();

  defaultGridOptions: GridOptions<Partial<T>> = {
    context: this,
    rowStyle: { cursor: "pointer" },
    undoRedoCellEditing: true,
    stopEditingWhenCellsLoseFocus: true,
    suppressCellFocus: true,
    // editType: "fullRow",
    enableCellChangeFlash: true,
    pagination: true,
    paginationAutoPageSize: true,
    rowSelection: "multiple",
    animateRows: true,
    autoSizeStrategy: {
      type: "fitCellContents",
    },
    enableFillHandle: true,
    onCellValueChanged: this.onCellValueChanged.bind(this),
    onCellMouseOver: this.onCellMouseOver.bind(this),
    onUndoStarted: this.onUndoStarted.bind(this),
    onUndoEnded: this.onUndoEnded.bind(this),
    onRedoStarted: this.onRedoStarted.bind(this),
    onRedoEnded: this.onRedoEnded.bind(this),
    loadingOverlayComponent: LoadingOverlayComponent,
  };

  private hoveredRow: number | null = null;

  protected combinedGridOptions: GridOptions<Partial<T>> = {
    ...this.defaultGridOptions,
    ...this.gridOptions,
  };

  protected colDefsWithEdit: ColDef[] = [
    {
      checkboxSelection: true,
      filter: false,
      sortable: false,
      resizable: false,
      maxWidth: 30,
      suppressCellFlash: true,
    },
    {
      filter: false,
      sortable: false,
      cellClass: "edit-cell",
      resizable: false,
      maxWidth: 75,
      cellRenderer: EditCellRendererComponent,
      suppressCellFlash: true,
    },
  ];

  constructor(
    private themeSvc: ThemeService,
    private serachSvc: SearchService,
    private alertSvc: AlertService,
  ) {
    effect(() => {
      const quickFilterText = this.serachSvc.search;
      this.api?.updateGridOptions({ quickFilterText });
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected getRowId(row: any) {
    return row.data.id;
  }

  public confirmExport() {
    //TODO: dialog to tell people that it only exports
    //the columns on the grid. If they want to export
    //all data then they should use the export component

    const dialog = document.querySelector("#confirmExport");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (dialog as any)?.showModal();
  }

  protected exportToCSV() {
    this.api!.exportDataAsCsv();
  }

  public getTheme() {
    return this.themeSvc.theme === "light"
      ? "ag-theme-quartz"
      : "ag-theme-quartz-dark";
  }

  public onGridReady(params: GridReadyEvent) {
    this.colDefsWithEdit = [...this.colDefsWithEdit, ...this.colDefs];

    this.api = params.api;
    this.refreshGrid();
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onCellValueChanged(row: CellValueChangedEvent<Partial<T>>) {
    const rowNode = this.api?.getDisplayedRowAtIndex(row.rowIndex!);
    this.api?.flashCells({ rowNodes: [rowNode!] });
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public onCellMouseOver(params: CellMouseOverEvent<Partial<T>>) {
    this.hoveredRow = params.rowIndex;
  }

  public onUndoStarted(event: UndoStartedEvent) {
    console.log("undoStarted", event);
  }

  public onUndoEnded(event: UndoStartedEvent) {
    console.log("undoEnded", event);
  }

  public onRedoStarted(event: RedoStartedEvent) {
    console.log("redoStarted", event);
  }

  public onRedoEnded(event: RedoStartedEvent) {
    console.log("redoEnded", event);
  }

  public undo() {
    this.api?.undoCellEditing();
  }

  public redo() {
    this.api?.redoCellEditing();
  }

  public refreshGrid(forced: boolean = false) {
    this.api!.showLoadingOverlay();
    this.refresh.emit({ forced });
  }

  public sendAbort() {
    this.abortRefresh.emit();
    this.api!.hideOverlay();
  }

  protected emitAdd() {
    this.api?.applyTransaction({
      addIndex: 0,
      add: [{}],
    });
    this.rowData.push({});
    this.add.emit();
  }

  protected doImportCSV() {
    // upload the file to storage
    // pass the link to emit
    this.importCSV.emit();
  }

  protected applyFilter() {
    this.filter.emit();
  }
  protected emitEdit() {
    this.edit.emit();
  }
  protected emitDelete() {
    this.delete.emit();
  }

  public deleteHoveredRow() {
    if (this.hoveredRow !== null) {
      this.api?.applyTransaction({ remove: [this.rowData[this.hoveredRow!]] });
      this.rowData.splice(this.hoveredRow!, 1);
      this.alertSvc.show({
        text: "Row deleted successfully",
        type: "success",
        OKBtn: "OK",
      });
    }
  }
}
