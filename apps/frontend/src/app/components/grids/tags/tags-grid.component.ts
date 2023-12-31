import { CommonModule } from "@angular/common";
import { Component } from "@angular/core";
import { Router } from "@angular/router";
import { AddTagType } from "@common";
import { AlertService } from "@services/alert.service";
import { BaseGridService } from "@services/base-grid.service";
import { SearchService } from "@services/search.service";
import { TYPE, TagsGridService } from "@services/tags-grid.service";
import { ThemeService } from "@services/theme.service";
import { DatagridComponent } from "@uxcommon/datagrid/datagrid.component";

@Component({
  selector: "pc-tags-grid",
  standalone: true,
  imports: [CommonModule, DatagridComponent],
  templateUrl: "./tags-grid.component.html",
  styleUrl: "./tags-grid.component.scss",
  providers: [{ provide: BaseGridService, useClass: TagsGridService }],
})
export class TagsGridComponent extends DatagridComponent<TYPE, AddTagType> {
  protected col = [
    { field: "name", headerName: "Tag Name", editable: true },
    { field: "description", headerName: "Description", editable: true },
    { field: "count", headerName: "Times Used", editable: true },
  ];

  constructor(
    router: Router,
    themeSvc: ThemeService,
    serachSvc: SearchService,
    alertSvc: AlertService,
    gridSvc: TagsGridService,
  ) {
    super(router, themeSvc, serachSvc, alertSvc, gridSvc);
  }
}
