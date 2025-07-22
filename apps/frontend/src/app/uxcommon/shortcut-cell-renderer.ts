import { ICellRendererAngularComp } from '@ag-grid-community/angular';
import { ICellRendererParams } from '@ag-grid-community/core';

import { Component, ViewEncapsulation } from '@angular/core';
import { IconsComponent } from '@uxcommon/icons.component';
import { Models } from 'common/src/lib/kysely.models';
import { DataGrid } from './datagrid';

@Component({
  selector: 'pc-shortcut-cell-renderer',
  imports: [IconsComponent],
  templateUrl: './shortcut-cell-renderer.html',
  styles: [
    `
      .ag-row-hover {
        .shortcut-cell {
          visibility: visible;
        }
      }
    `,
  ],
  encapsulation: ViewEncapsulation.None,
})
export class ShortcutCellRenderer<T extends keyof Models, U> implements ICellRendererAngularComp {
  private parent: DataGrid<T, U> | undefined;

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
