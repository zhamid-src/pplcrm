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
  GetRowIdParams,
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
  protected processing = false;

  @Input({ required: true }) colDefs: ColDef[] = [];
  @Input({ required: true }) rowData: Partial<T>[] = [];
  @Input() gridOptions: GridOptions<Partial<T>> = {};

  @Input() disableAdd = false;
  @Input() disableRefresh = false;
  @Input() disableImport = false;
  @Input() disableExport = false;
  @Input() disableFilter = false;
  @Input() disableEdit = false;

  @Output() refresh = new EventEmitter<{ forced: boolean }>();
  @Output() abortRefresh = new EventEmitter<void>();
  @Output() add = new EventEmitter();
  @Output() importCSV = new EventEmitter();
  @Output() filter = new EventEmitter();
  @Output() edit = new EventEmitter();
  @Input() onDelete: ((row: Partial<T>) => Promise<boolean>) | undefined;

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

  // Checkbox and delete icon columns
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

  protected getRowId(row: GetRowIdParams) {
    return row.data.id;
  }

  public confirmExport() {
    const dialog = document.querySelector(
      "#confirmExport",
    ) as HTMLDialogElement;
    dialog.showModal();
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

  onCellValueChanged(row: CellValueChangedEvent<Partial<T>>) {
    this.api?.flashCells({ rowNodes: [row.node!], columns: [row.column] });
  }
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

  public async deleteHoveredRow() {
    if (!this.onDelete) {
      return;
    }

    if (this.hoveredRow !== null) {
      this.processing = true;

      const deleted = await this.onDelete(this.rowData[this.hoveredRow!]);
      if (!deleted) {
        this.alertSvc.showError(
          "Could not delete the row. Please try again later.",
        );
      } else {
        this.api?.applyTransaction({
          remove: [this.rowData[this.hoveredRow!]],
        });
        this.rowData.splice(this.hoveredRow!, 1);
      }
      this.processing = false;
    }
  }
}
