import { CommonModule } from "@angular/common";
import { Component } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { TYPE, TagsManagerService } from "@services/tagsmanager.service";
import { DatagridComponent } from "@uxcommon/datagrid/datagrid.component";
import { ColDef } from "ag-grid-community";

@Component({
  selector: "pc-tags-manager",
  standalone: true,
  imports: [CommonModule, DatagridComponent],
  templateUrl: "./tags-manager.component.html",
  styleUrl: "./tags-manager.component.scss",
})
export class TagsManagerComponent {
  protected colDefs: ColDef[] = [
    { field: "name", headerName: "Tag Name" },
    { field: "description", headerName: "Description" },
    { field: "count", headerName: "Times Used" },
  ];
  protected rowData: Partial<TYPE>[] = [];

  constructor(
    private tagsSvc: TagsManagerService,
    private router: Router,
    private route: ActivatedRoute,
  ) {}

  public async refresh() {
    const data = await this.tagsSvc.getAll();
    this.rowData = data;
  }
  public abortRefresh() {
    this.tagsSvc.abort();
  }
  protected add() {
    this.router.navigate(["add"], { relativeTo: this.route });
  }
}
