import { CellDoubleClickedEvent, ColDef } from "@ag-grid-community/core";
import { Component } from "@angular/core";
import { UpdatePersonsObj, UpdatePersonsType } from "@common";
import { AbstractAPIService } from "@services/backend/abstract.service";
import { PersonsService, TYPE } from "@services/backend/persons.service";
import { DatagridComponent } from "@uxcommon/datagrid/datagrid.component";
import { IconsComponent } from "@uxcommon/icons/icons.component";
import { TagsCellRendererComponent } from "../tags-cell-renderer/tagsCellRenderer.component";

interface ParamsType {
  value: string[];
}

@Component({
  selector: "pc-persons-grid",
  imports: [DatagridComponent, IconsComponent],
  templateUrl: "./persons-grid.component.html",
  styleUrl: "./persons-grid.component.css",
  providers: [{ provide: AbstractAPIService, useClass: PersonsService }],
})
export class PersonsGridComponent extends DatagridComponent<
  TYPE,
  UpdatePersonsType
> {
  protected col: ColDef[] = [
    { field: "first_name", headerName: "First Name", editable: true },
    { field: "last_name", headerName: "Last Name", editable: true },
    { field: "email", headerName: "Email", editable: true },
    { field: "mobile", headerName: "Mobile", editable: true },
    { field: "home_phone", headerName: "Home phone", editable: false },
    {
      field: "tags",
      filter: true,
      headerName: "Tags",
      cellDataType: "object",
      cellRendererParams: {
        type: "persons",
        obj: UpdatePersonsObj,
        service: this.gridSvc,
      },
      cellRenderer: TagsCellRendererComponent,
      onCellDoubleClicked: this.openEditOnDoubleClick.bind(this),
      equals: (tagsA: string[], tagsB: string[]) =>
        this.tagArrayEquals(tagsA, tagsB) === 0,
      valueFormatter: (params: ParamsType) => this.tagsToString(params.value),
      comparator: (tagsA: string[], tagsB: string[]) =>
        this.tagArrayEquals(tagsA, tagsB),
    },
    {
      field: "street_num",
      headerName: "Street Number",
      editable: false,
      onCellDoubleClicked: this.confirmOpenEditOnDoubleClick.bind(this),
    },
    {
      field: "apt",
      headerName: "Apt",
      editable: false,
      onCellDoubleClicked: this.confirmOpenEditOnDoubleClick.bind(this),
    },
    {
      field: "street",
      headerName: "Street",
      editable: false,
      onCellDoubleClicked: this.confirmOpenEditOnDoubleClick.bind(this),
    },
    {
      field: "city",
      headerName: "City",
      editable: false,
      onCellDoubleClicked: this.confirmOpenEditOnDoubleClick.bind(this),
    },
    {
      field: "state",
      headerName: "State/Province",
      editable: false,
      onCellDoubleClicked: this.confirmOpenEditOnDoubleClick.bind(this),
    },
    {
      field: "zip",
      headerName: "Zip/Province",
      editable: false,
      onCellDoubleClicked: this.confirmOpenEditOnDoubleClick.bind(this),
    },
    {
      field: "country",
      headerName: "Country",
      editable: false,
      onCellDoubleClicked: this.confirmOpenEditOnDoubleClick.bind(this),
    },

    { field: "notes", headerName: "Notes", editable: true },
  ];

  private addressChangeModalId: string | null = null;

  constructor() {
    super();
  }

  protected confirmOpenEditOnDoubleClick(event: CellDoubleClickedEvent) {
    this.addressChangeModalId = event.data.household_id;
    this.confirmAddressChange();
  }

  protected routeToHouseholds() {
    const dialog = document.querySelector(
      "#confirmAddressEdit",
    ) as HTMLDialogElement;
    dialog.close();

    if (this.addressChangeModalId !== null) {
      this.router.navigate([
        "console",
        "households",
        this.addressChangeModalId,
      ]);
    }
  }

  /**
   * Confirm if the user actually wants to change the address
   *
   */
  private confirmAddressChange(): void {
    const dialog = document.querySelector(
      "#confirmAddressEdit",
    ) as HTMLDialogElement;
    dialog.showModal();
  }
}
