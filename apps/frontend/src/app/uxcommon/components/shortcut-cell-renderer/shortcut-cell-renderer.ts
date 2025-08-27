import { Component, ViewEncapsulation } from '@angular/core';
import { Icon } from '@icons/icon';
import { DataGrid } from '@uxcommon/components/datagrid/datagrid';

import { ICellRendererAngularComp } from 'ag-grid-angular';
import { ICellRendererParams } from 'ag-grid-community';

import { Models } from 'common/src/lib/kysely.models';

/**
 * A custom cell renderer used by the AG Grid to render shortcut actions like
 * view and delete in a row.
 *
 * This component interacts with the parent `DataGrid` component to trigger
 * row-level actions.
 */
@Component({
  selector: 'pc-shortcut-cell-renderer',
  imports: [Icon],
  styles: [
    `
      .ag-row-hover {
        .shortcut-cell {
          visibility: visible;
        }
      }
    `,
  ],
  template: ` <div class="shortcut-cell invisible flex flex-row gap-1 pl-0 ml-0">
    @if (showView()) {
      <pc-icon name="arrow-top-right-on-square" [size]="4" class="hover:text-primary text-left" (click)="view()" />
    }
    @if (showDelete()) {
      <pc-icon name="trash" [size]="4" class="hover:text-error text-left" (click)="delete()" />
    }
  </div>`,
  encapsulation: ViewEncapsulation.None,
})
export class ShortcutCellRenderer<T extends keyof Models, U> implements ICellRendererAngularComp {
  private parent: DataGrid<T, U> | undefined;

  /**
   * Called by AG Grid to initialize the cell renderer with the given parameters.
   * Stores the parent DataGrid component from the context for later use.
   *
   * @param params - The cell renderer parameters, including grid context.
   */
  public agInit(params: ICellRendererParams<T, number>): void {
    this.parent = params.context;
  }

  /**
   * Triggers the delete confirmation flow in the parent grid.
   */
  public delete() {
    this.parent?.confirmDelete();
  }

  /**
   * Called by AG Grid when it wants to refresh the cell.
   *
   * @returns False, since this cell does not support dynamic refresh.
   */
  public refresh(/*params: ICellRendererParams*/) {
    return false;
  }

  /**
   * Determines whether the delete shortcut button should be shown.
   *
   * @returns True if delete is enabled in the parent grid.
   */
  public showDelete() {
    return !this.parent?.disableDelete();
  }

  /**
   * Determines whether the view shortcut button should be shown.
   *
   * @returns True if view is enabled in the parent grid.
   */
  public showView() {
    return !this.parent?.disableView();
  }

  /**
   * Navigates to the view screen for the current row.
   */
  public view() {
    this.parent?.view();
  }
}
