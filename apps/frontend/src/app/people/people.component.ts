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

  constructor(
    private personsSvc: PersonsService,
    private themeSvc: ThemeService,
    private serachSvc: SearchService,
  ) {
    effect(() => {
      const search = this.serachSvc.search;
      if (this.api) {
        if (search?.length) {
          this.api.setQuickFilter(search);
        } else {
          this.api.resetQuickFilter();
        }
      }
    });
  }
  protected rowData = [];

  protected defaultColDef: ColDef = {
    // filter: true,
  };

  protected colDefs: ColDef[] = [
    { field: "first_name" },
    { field: "last_name" },
    { field: "email" },
    { field: "notes" },
  ];

  getTheme() {
    return this.themeSvc.theme === "light"
      ? "ag-theme-quartz"
      : "ag-theme-quartz-dark";
  }
  onGridReady(params: GridReadyEvent) {
    this.api = params.api;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.personsSvc.getAll().subscribe((data: any) => (this.rowData = data));
  }
}
