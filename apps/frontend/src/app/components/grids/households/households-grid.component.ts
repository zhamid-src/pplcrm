import { CommonModule } from "@angular/common";
import { Component } from "@angular/core";
import { Router } from "@angular/router";
import { AlertService } from "@services/alert.service";
import { BaseGridService } from "@services/base-grid.service";
import { HouseholdsGridService, TYPE } from "@services/households-grid.service";
import { SearchService } from "@services/search.service";
import { ThemeService } from "@services/theme.service";
import { DatagridComponent } from "@uxcommon/datagrid/datagrid.component";

@Component({
  selector: "pc-households-grid",
  standalone: true,
  imports: [CommonModule, DatagridComponent],
  templateUrl: "./households-grid.component.html",
  styleUrl: "./households-grid.component.scss",
  providers: [{ provide: BaseGridService, useClass: HouseholdsGridService }],
})
export class HouseholdsGridComponent extends DatagridComponent<TYPE, never> {
  protected col = [
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

  constructor(
    router: Router,
    themeSvc: ThemeService,
    serachSvc: SearchService,
    alertSvc: AlertService,
    gridSvc: HouseholdsGridService,
  ) {
    super(router, themeSvc, serachSvc, alertSvc, gridSvc);
  }
}
