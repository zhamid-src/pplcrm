import { CommonModule } from "@angular/common";
import { Component, effect } from "@angular/core";
import { AgGridModule } from "ag-grid-angular";
import { ColDef, GridReadyEvent } from "ag-grid-community";
import { PersonsService } from "../services/persons.service";
import { SearchService } from "../services/search.service";
import { ThemeService } from "../services/theme.service";

@Component({
  selector: "pplcrm-people",
  standalone: true,
  imports: [CommonModule, AgGridModule],
  templateUrl: "./people.component.html",
  styleUrl: "./people.component.scss",
})
export class PeopleComponent {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private api: any;
  protected rowSelection: "single" | "multiple" = "single";

  gridOptions = {
    // set background colour on every row, this is probably bad, should be using CSS classes
    rowStyle: { cursor: "pointer" },
    suppressCellFocus: true,
    // other grid options ...
  };

  constructor(
    private personsSvc: PersonsService,
    private themeSvc: ThemeService,
    private serachSvc: SearchService,
  ) {
    effect(() => {
      const search = this.serachSvc.search;
      if (this.api) {
        this.api.setQuickFilter(search);
      }
    });
  }
  protected rowData = null;

  protected defaultColDef: ColDef = {
    // filter: true,
  };

  protected colDefs: ColDef[] = [
    { field: "first_name", headerName: "First Name" },
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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.personsSvc
      .getAllWithHouseholds()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .subscribe((data: any) => (this.rowData = data));
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
  onSelectionChanged(event: any) {
    const selectedRows = this.api.getSelectedRows();
    console.log(selectedRows);
  }
}
