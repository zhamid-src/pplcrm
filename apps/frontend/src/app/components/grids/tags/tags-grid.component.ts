import { CommonModule } from "@angular/common";
import { Component } from "@angular/core";
import { AddTagType } from "@common";
import { AlertService } from "@services/alert.service";
import { BaseGridService } from "@services/base-grid.service";
import { SearchService } from "@services/search.service";
import { TYPE, TagsService } from "@services/tags.service";
import { ThemeService } from "@services/theme.service";
import { DatagridComponent } from "@uxcommon/datagrid/datagrid.component";

@Component({
  selector: "pc-tags-grid",
  standalone: true,
  imports: [CommonModule, DatagridComponent],
  templateUrl: "./tags-grid.component.html",
  styleUrl: "./tags-grid.component.scss",
  providers: [{ provide: BaseGridService, useClass: TagsService }],
})
export class TagsGridComponent extends DatagridComponent<TYPE, AddTagType> {
  protected col = [
    { field: "name", headerName: "Tag Name" },
    { field: "description", headerName: "Description" },
    { field: "count", headerName: "Times Used" },
  ];

  constructor(
    themeSvc: ThemeService,
    serachSvc: SearchService,
    alertSvc: AlertService,
    gridSvc: TagsService,
  ) {
    super(themeSvc, serachSvc, alertSvc, gridSvc);
  }
}
