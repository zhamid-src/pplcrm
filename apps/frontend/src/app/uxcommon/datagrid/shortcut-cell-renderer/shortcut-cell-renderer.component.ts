import { ICellRendererAngularComp } from '@ag-grid-community/angular';
import { ICellRendererParams } from '@ag-grid-community/core';
import { CommonModule } from '@angular/common';
import { Component, ViewEncapsulation } from '@angular/core';
import { IconsComponent } from '@uxcommon/icons/icons.component';
import { Models } from 'common/src/lib/kysely.models';
import { DatagridComponent } from '../datagrid.component';

@Component({
  selector: 'pc-shortcut-cell-renderer',
  standalone: true,
  imports: [CommonModule, IconsComponent],
  templateUrl: './shortcut-cell-renderer.component.html',
  styleUrl: './shortcut-cell-renderer.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class ShortcutCellRendererComponent<T extends keyof Models, U>
  implements ICellRendererAngularComp
{
  private parent: DatagridComponent<T, U> | undefined;

  public agInit(params: ICellRendererParams<T, number>): void {
    this.parent = params.context;
  }

  public delete() {
    this.parent?.confirmDelete();
  }

  public showDelete() {
    return !this.parent?.disableDelete();
  }

  public showView() {
    return !this.parent?.disableView();
  }

  public view() {
    this.parent?.view();
  }

  public refresh(/*params: ICellRendererParams*/) {
    return false;
  }
}
