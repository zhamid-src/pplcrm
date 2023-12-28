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
import { Models } from "common/src/lib/kysely.models";
import { LoadingOverlayComponent } from "./overlay/loadingOverlay.component";
import { DeleteCellRendererComponent } from "./shortcut-cell-renderer/shortcut-cell-renderer.component";

@Component({
  selector: "pc-datagrid",
  standalone: true,
  imports: [CommonModule, AgGridModule, IconsComponent],
  templateUrl: "./datagrid.component.html",
  styleUrl: "./datagrid.component.scss",
})
export class DatagridComponent<T extends keyof Models> {
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
  @Input() onDelete:
    | ((row: (Partial<T> & { id: number })[]) => Promise<boolean>)
    | undefined;
  @Input() onEdit:
    | ((id: number, row: Partial<T>) => Promise<boolean>)
    | undefined;

  defaultGridOptions: GridOptions<Partial<T>> = {
    context: this,
    rowStyle: { cursor: "pointer" },
    undoRedoCellEditing: true,
    stopEditingWhenCellsLoseFocus: true,
    suppressCellFocus: true,
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
      cellClass: "shortcut-cell",
      resizable: false,
      minWidth: 50,
      maxWidth: 60,
      cellRenderer: DeleteCellRendererComponent,
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

  private createPayload<T>(
    row: Partial<T>,
    key: keyof T,
  ): Partial<Pick<T, typeof key>> {
    const payload: Partial<Pick<T, typeof key>> = {};

    // Check if the key exists in the row and is not undefined
    if (key in row && row[key] !== undefined) {
      payload[key] = row[key];
    }

    return payload;
  }

  async onCellValueChanged(event: CellValueChangedEvent<Partial<T>>) {
    if (!this.onEdit) return;

    const key = event.colDef.field as keyof T;
    const row = event.data as Partial<T> & { id: number };
    const payload = this.createPayload(row, key);

    this.processing = true;
    const edited = await this.onEdit(Number(row.id), payload);
    if (!edited) {
      this.alertSvc.showError(
        "Could not edit the row. Please try again later.",
      );
      this.undo();
    } else {
      this.api?.flashCells({
        rowNodes: [event.node!],
        columns: [event.column],
      });
    }
    this.processing = false;
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

  open() {
    console.log("opening");
  }
  confirmDelete() {
    if (!this.onDelete) {
      return this.alertSvc.showError(
        "You do not have the permission to delete rows from this table.",
      );
    }

    const dialog = document.querySelector(
      "#confirmDelete",
    ) as HTMLDialogElement;
    dialog.showModal();
  }

  protected async deleteSelectedRows() {
    const rows = this.api?.getSelectedRows() as (Partial<T> & { id: number })[];
    if (!rows?.length) {
      return this.alertSvc.showError(
        "Please select at least one row to delete.",
      );
    }

    this.processing = true;

    const deleted = await this.onDelete!(rows);
    if (!deleted) {
      this.alertSvc.showError(
        "Could not delete the row. Please try again later.",
      );
    } else {
      this.api?.applyTransaction({ remove: rows });
      rows.forEach((row) => this.rowData.splice(row.id!, 1));
    }
    this.processing = false;
  }
}
