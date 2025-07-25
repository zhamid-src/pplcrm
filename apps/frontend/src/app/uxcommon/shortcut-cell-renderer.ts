import { ICellRendererAngularComp } from "@ag-grid-community/angular";
import { ICellRendererParams } from "@ag-grid-community/core";
import { Component, ViewEncapsulation } from "@angular/core";
import { Icon } from "@uxcommon/icon";

import { DataGrid } from "./datagrid";
import { Models } from "common/src/lib/kysely.models";

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
