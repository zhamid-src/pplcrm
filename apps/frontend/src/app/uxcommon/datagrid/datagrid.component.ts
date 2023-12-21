import { CommonModule } from "@angular/common";
import { Component, EventEmitter, Input, Output, effect } from "@angular/core";
import { SearchService } from "@services/search.service";
import { ThemeService } from "@services/theme.service";
import { IconsComponent } from "@uxcommon/icons/icons.component";
import { AgGridModule } from "ag-grid-angular";
import {
  ColDef,
  GridApi,
  GridOptions,
  GridReadyEvent,
  RowSelectedEvent,
} from "ag-grid-community";

@Component({
  selector: "pplcrm-datagrid",
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

  @Output() refresh = new EventEmitter<{ forced: boolean }>();

  public _loading = '<span class="inline loading loading-infinity"></span>';

  defaultGridOptions: GridOptions<Partial<T>> = {
    rowStyle: { cursor: "pointer" },
    suppressCellFocus: true,
    overlayLoadingTemplate: this._loading,
    pagination: true,
    paginationAutoPageSize: true,
    rowSelection: "multiple",
    onRowSelected: this.onRowSelected.bind(this),
    onRowDataUpdated: this.onRowDataUpdated.bind(this),
  };

  protected combinedGridOptions: GridOptions<Partial<T>> = {
    ...this.defaultGridOptions,
    ...this.gridOptions,
  };

  constructor(
    private themeSvc: ThemeService,
    private serachSvc: SearchService,
  ) {
    // Set effects
    effect(() => {
      const quickFilterText = this.serachSvc.search;
      this.api?.updateGridOptions({ quickFilterText });
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public onRowDataUpdated(/*event: GridReadyEvent*/) {
    // empty
  }

  public exportToCSV() {
    this.api!.exportDataAsCsv();
  }

  public getTheme() {
    return this.themeSvc.theme === "light"
      ? "ag-theme-quartz"
      : "ag-theme-quartz-dark";
  }

  public onGridReady(params: GridReadyEvent) {
    this.api = params.api;
    this.refreshGrid();
  }

  public onRowSelected(event: RowSelectedEvent<Partial<T>>) {
    const selectedRow = event.data;
    console.log(selectedRow);
    // const selectedRows = this.api!.getSelectedRows();
  }

  public refreshGrid(forced: boolean = false) {
    console.log("forced refresh is", forced);
    this.api!.showLoadingOverlay();

    this.refresh.emit({ forced });
  }
}
