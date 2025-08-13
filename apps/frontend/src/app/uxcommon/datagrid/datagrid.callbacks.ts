// datagrid.callbacks.ts
import type { GridOptions } from 'ag-grid-community';

import { DataGrid } from './datagrid';
import { Models } from 'common/src/lib/kysely.models';

export function buildGridCallbacks<T extends keyof Models, U = unknown>(ctx: DataGrid<T, U>): GridOptions {
  return {
    context: ctx,
    onCellValueChanged: ctx.onCellValueChanged.bind(ctx),
    onCellMouseOver: ctx.onCellMouseOver.bind(ctx),
    onSelectionChanged: ctx.onSelectionChanged.bind(ctx),
    onUndoEnded: ctx.updateUndoSizes,
    onRedoEnded: ctx.updateUndoSizes,
    onRowDataUpdated: ctx.updateUndoSizes,
    onRowValueChanged: ctx.updateUndoSizes,
  } as GridOptions;
}
