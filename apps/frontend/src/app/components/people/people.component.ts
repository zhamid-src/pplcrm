import { CommonModule } from "@angular/common";
import { Component } from "@angular/core";
import { UpdatePersonsType } from "@common";
import { PersonsService, TYPE } from "@services/persons.service";
import { DatagridComponent } from "@uxcommon/datagrid/datagrid.component";
import { ColDef } from "ag-grid-community";

@Component({
  selector: "pc-people",
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
      headerTooltip: "First name",
      editable: true,
    },
    { field: "last_name", headerName: "Last Name", editable: true },
    { field: "email", headerName: "Email", editable: true },
    { field: "mobile", headerName: "Mobile", editable: true },
    { field: "street1", headerName: "Street" },
    { field: "city", headerName: "City" },
    { field: "notes", headerName: "Notes", editable: true },
  ];

  protected rowData: Partial<TYPE>[] = [];

  constructor(private personsSvc: PersonsService) {}

  public async refresh(input: { forced: boolean }) {
    const forced = input?.forced || false;
    const data = await this.personsSvc.getAllWithHouseholds({}, forced);
    this.rowData = data;
  }

  public abortRefresh() {
    this.personsSvc.abort();
  }

  delete = async (rows: (Partial<TYPE> & { id: number })[]) => {
    const ids = rows.map((row) => Number(row.id));
    return await this.personsSvc
      .deleteMany(ids)
      .then(() => true)
      .catch(() => false);
  };

  edit = async (id: number, data: Partial<TYPE>) => {
    return await this.personsSvc
      .update(id, data as unknown as UpdatePersonsType)
      .then(() => true)
      .catch(() => false);
  };
}
