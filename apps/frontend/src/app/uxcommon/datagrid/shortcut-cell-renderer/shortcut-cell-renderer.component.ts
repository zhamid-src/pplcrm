import { CommonModule } from "@angular/common";
import { Component, ViewEncapsulation } from "@angular/core";
import { IconsComponent } from "@uxcommon/icons/icons.component";
import { ICellRendererAngularComp } from "ag-grid-angular";
import { ICellRendererParams } from "ag-grid-community";
import { Models } from "common/src/lib/kysely.models";
import { DatagridComponent } from "../datagrid.component";

@Component({
  selector: "pc-shortcut-cell-renderer",
  standalone: true,
  imports: [CommonModule, IconsComponent],
  templateUrl: "./shortcut-cell-renderer.component.html",
  styleUrl: "./shortcut-cell-renderer.component.scss",
  encapsulation: ViewEncapsulation.None,
})
export class DeleteCellRendererComponent<T extends keyof Models>
  implements ICellRendererAngularComp
{
  private parent: DatagridComponent<T> | undefined;

  agInit(params: ICellRendererParams<T, number>): void {
    this.parent = params.context;
  }

  refresh(/*params: ICellRendererParams*/) {
    return false;
  }

  open() {
    this.parent?.open();
  }

  delete() {
    this.parent?.confirmDelete();
  }
}
