import { Component } from "@angular/core";
import { AddTagType } from "@common";
import { AbstractAPIService } from "@services/backend/abstract.service";
import { TagsService } from "@services/backend/tags.service";
import { DatagridComponent } from "@uxcommon/datagrid/datagrid.component";

@Component({
  selector: "pc-tags-grid",
  imports: [DatagridComponent],
  templateUrl: "./tags-grid.component.html",
  styleUrl: "./tags-grid.component.css",
  providers: [{ provide: AbstractAPIService, useClass: TagsService }],
})
export class TagsGridComponent extends DatagridComponent<"tags", AddTagType> {
  protected col = [
    { field: "name", headerName: "Tag Name", editable: true },
    { field: "description", headerName: "Description", editable: true },
    { field: "use_count_people", headerName: "People" },
    { field: "use_count_households", headerName: "Households" },
  ];

  constructor() {
    super();
  }
}
