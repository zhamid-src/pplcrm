import { CommonModule } from "@angular/common";
import { Component, effect } from "@angular/core";
import { AgGridModule } from "ag-grid-angular";
import {
  ColDef,
  GridApi,
  GridOptions,
  GridReadyEvent,
  RowSelectedEvent,
} from "ag-grid-community";
import { TableType } from "common/src/lib/kysely.models";
import { IconsComponent } from "../icons/icons.component";
import { PersonsService } from "../services/persons.service";
import { SearchService } from "../services/search.service";
import { ThemeService } from "../services/theme.service";

@Component({
  selector: "pplcrm-people",
  standalone: true,
  imports: [CommonModule, AgGridModule, IconsComponent],
  templateUrl: "./people.component.html",
  styleUrl: "./people.component.scss",
})
export class PeopleComponent {
  private api:
    | GridApi<Partial<TableType.persons | TableType.households>>
    | undefined;
  protected rowSelection: "single" | "multiple" = "multiple";

  loading =
    '<span class="ag-overlay-loading-center">Download data ... <span class="inline loading loading-infinity"></span></span>';

  gridOptions: GridOptions<Partial<TableType.persons | TableType.households>> =
    {
      rowStyle: { cursor: "pointer" },
      suppressCellFocus: true,
      overlayLoadingTemplate: this.loading,
      onRowSelected: this.onRowSelected.bind(this),
      // other grid options ...
    };

  protected rowData: Partial<TableType.persons | TableType.households>[] = [];

  protected defaultColDef: ColDef = {
    // filter: true,
  };

  constructor(
    private personsSvc: PersonsService,
    private themeSvc: ThemeService,
    private serachSvc: SearchService,
  ) {
    // Set effects
    effect(() => {
      const quickFilterText = this.serachSvc.search;
      this.api?.updateGridOptions({ quickFilterText });
    });
  }

  protected colDefs: ColDef[] = [
    { field: "first_name", headerName: "First Name", checkboxSelection: true },
    { field: "last_name", headerName: "Last Name" },
    { field: "email", headerName: "Email" },
    { field: "mobile", headerName: "Mobile" },
    { field: "street1", headerName: "Street" },
    { field: "city", headerName: "City" },
    { field: "notes", headerName: "Notes" },
  ];

  getTheme() {
    return this.themeSvc.theme === "light"
      ? "ag-theme-quartz"
      : "ag-theme-quartz-dark";
  }
  onGridReady(params: GridReadyEvent) {
    this.api = params.api;
    this.refreshGrid();
  }

  onRowSelected(
    event: RowSelectedEvent<Partial<TableType.persons | TableType.households>>,
  ) {
    const selectedRow = event.data;
    console.log(selectedRow);
    const selectedRows = this.api!.getSelectedRows();
    console.log(selectedRows);
  }
  exportToCSV() {
    this.api!.exportDataAsCsv();
  }
  refreshGrid() {
    this.api!.showLoadingOverlay();

    setTimeout(() => {
      this.personsSvc
        .getAllWithHouseholds()
        .subscribe((data) => (this.rowData = data));
    }, 2000);
  }
}
