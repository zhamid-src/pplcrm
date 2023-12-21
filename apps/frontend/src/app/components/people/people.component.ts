import { CommonModule } from "@angular/common";
import { Component } from "@angular/core";
import { PersonsService } from "@services/persons.service";
import { DatagridComponent } from "@uxcommon/datagrid/datagrid.component";
import { ColDef } from "ag-grid-community";
import { TableType } from "common/src/lib/kysely.models";

type TYPE = TableType.persons | TableType.households;

@Component({
  selector: "pplcrm-people",
  standalone: true,
  imports: [CommonModule, DatagridComponent],
  templateUrl: "./people.component.html",
  styleUrl: "./people.component.scss",
})
export class PeopleComponent {
  protected colDefs: ColDef[] = [
    {
      field: "first_name",
      headerName: "First Name",
      checkboxSelection: true,
    },
    { field: "last_name", headerName: "Last Name" },
    { field: "email", headerName: "Email" },
    { field: "mobile", headerName: "Mobile" },
    { field: "street1", headerName: "Street" },
    { field: "city", headerName: "City" },
    { field: "notes", headerName: "Notes" },
  ];

  protected rowData: Partial<TYPE>[] = [];

  constructor(private personsSvc: PersonsService) {}

  public refresh() {
    return this.personsSvc
      .getAllWithHouseholds()
      .subscribe((data) => (this.rowData = data));
  }
}
