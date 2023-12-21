import { CommonModule } from "@angular/common";
import { Component } from "@angular/core";
import { PersonsService, TYPE } from "@services/persons.service";
import { DatagridComponent } from "@uxcommon/datagrid/datagrid.component";
import { ColDef } from "ag-grid-community";

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

  public refresh(input: { forced: boolean }) {
    const forced = input?.forced || false;
    return this.personsSvc
      .getAllWithHouseholds({}, forced)
      .subscribe((data: Partial<TYPE>[]) => (this.rowData = data));
  }
}
