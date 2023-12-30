import { CommonModule } from "@angular/common";
import { Component } from "@angular/core";
import { HouseholdsService, TYPE } from "@services/households.service";
import { DatagridComponent } from "@uxcommon/datagrid/datagrid.component";
import { ColDef } from "ag-grid-community";

@Component({
  selector: "pc-households-grid",
  standalone: true,
  imports: [CommonModule, DatagridComponent],
  templateUrl: "./households-grid.component.html",
  styleUrl: "./households-grid.component.scss",
})
export class HouseholdsGridComponent {
  protected colDefs: ColDef[] = [
    { field: "person_count", headerName: "People in household" },
    { field: "street1", headerName: "Street" },
    { field: "street2", headerName: "Street line 2" },
    { field: "city", headerName: "City" },
    { field: "state", headerName: "State/Province" },
    { field: "zip", headerName: "Zip/Province" },
    { field: "country", headerName: "Country" },
    { field: "home_phone", headerName: "Home phone" },
    { field: "notes", headerName: "Notes" },
  ];

  protected rowData: Partial<TYPE>[] = [];

  constructor(private householdsSvc: HouseholdsService) {}

  public async refresh(input: { forced: boolean }) {
    const forced = input?.forced || false;
    const data = await this.householdsSvc.getAllWithPeopleCount({}, forced);
    this.rowData = data;
  }

  public abortRefresh() {
    this.householdsSvc.abort();
  }
}
