import { CommonModule } from "@angular/common";
import { Component, ViewEncapsulation } from "@angular/core";
import { IconsComponent } from "@uxcommon/icons/icons.component";
import { ICellRendererAngularComp } from "ag-grid-angular";
import { ICellRendererParams } from "ag-grid-community";
import { DatagridComponent } from "../datagrid.component";

@Component({
  selector: "pc-edit-cell-renderer",
  standalone: true,
  imports: [CommonModule, IconsComponent],
  templateUrl: "./edit-cell-renderer.component.html",
  styleUrl: "./edit-cell-renderer.component.scss",
  encapsulation: ViewEncapsulation.None,
})
export class EditCellRendererComponent<T> implements ICellRendererAngularComp {
  private parent: DatagridComponent<T> | undefined;

  agInit(params: ICellRendererParams<T, number>): void {
    this.parent = params.context;
  }

  refresh(/*params: ICellRendererParams*/) {
    return false;
  }

  delete() {
    this.parent?.deleteHoveredRow();
  }
}
