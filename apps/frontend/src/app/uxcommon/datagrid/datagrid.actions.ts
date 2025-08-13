import type { EventEmitter } from '@angular/core';
import type { GridApi } from 'ag-grid-community';
import type { ConfirmDialogService } from '@uxcommon/shared-dialog-service';
import type { AlertService } from '@uxcommon/alerts/alert-service';
import type { AbstractAPIService } from '../../abstract-api.service';
import { bucketByRoute } from './datagrid.utils';

type DeleteCtx = {
  dialogs: ConfirmDialogService;
  alertSvc: AlertService;
  api: GridApi | undefined;
  getSelectedRows: () => (Partial<any> & { id: string })[];
  gridSvc: AbstractAPIService<any, any>;
  rowModelType: 'clientSide' | 'serverSide';
  mergedGridOptions: any;
};

export async function confirmDeleteAndRun(ctx: DeleteCtx): Promise<void> {
  const ok = await ctx.dialogs.confirm({
    title: 'Are you sure?',
    message: 'The selected rows will be deleted permanently. You cannot undo this.',
    variant: 'danger',
    icon: 'trash',
    confirmText: 'Delete',
    cancelText: 'Cancel',
    allowBackdropClose: false,
  });
  if (!ok) return;

  const api = ctx.api;
  if (!api) return;

  const rows = ctx.getSelectedRows();
  if (!rows.length) {
    ctx.alertSvc.showError('Please select at least one row to delete.');
    return;
  }

  const deletableRows = rows.filter((row) => !('deletable' in row) || (row as any).deletable !== false);
  if (deletableRows.length !== rows.length) {
    ctx.alertSvc.showError('Some rows cannot be deleted because these are system values.');
  }
  if (!deletableRows.length) return;

  api.setGridOption('loading', true);
  try {
    const ids = deletableRows.map((r) => r.id);
    const ok2 = await ctx.gridSvc.deleteMany(ids);
    if (!ok2) {
      ctx.alertSvc.showError('Could not delete. Please try again later.');
      return;
    }

    const isClient = ctx.rowModelType === 'clientSide';
    const idSet = new Set(ids.map(String));
    const hasGetRowId = !!ctx.mergedGridOptions?.getRowId;

    if (isClient) {
      // CLIENT-SIDE: remove by id (preferred) or by object refs
      if (hasGetRowId) {
        api.applyTransaction({ remove: ids.map((id) => ({ id })) as any[] });
      } else {
        const nodes = api.getSelectedNodes().filter((n) => n.data && idSet.has(String((n.data as any).id)));
        const removeRows = nodes.map((n) => n.data!).filter(Boolean) as any[];
        api.applyTransaction({ remove: removeRows });
      }
    } else {
      // SERVER-SIDE
      const storeType = ctx.mergedGridOptions?.serverSideStoreType ?? 'partial';
      const isFullStore = storeType === 'full';
      const canTx = isFullStore && typeof (api as any).applyServerSideTransaction === 'function';

      if (canTx && hasGetRowId) {
        const selectedNodes = api.getSelectedNodes().filter((n) => n.data && idSet.has(String((n.data as any).id)));
        const buckets = bucketByRoute(selectedNodes);

        if (buckets.size) {
          for (const [routeStr, list] of buckets) {
            (api as any).applyServerSideTransaction({
              route: JSON.parse(routeStr),
              remove: list.map((d) => ({ id: (d as any).id })),
            });
          }
        } else {
          (api as any).applyServerSideTransaction({ remove: ids.map((id) => ({ id })) });
        }
      } else {
        (api as any).refreshServerSide?.({ purge: true });
      }
    }

    api.deselectAll?.();
    ctx.alertSvc.showSuccess('Selected rows were successfully deleted.');
  } finally {
    api.setGridOption('loading', false);
  }
}

export async function doExportCsv(deps: {
  dialogs: ConfirmDialogService;
  api: GridApi | undefined;
  alertSvc: AlertService;
}) {
  const ok = await deps.dialogs.confirm({
    title: 'Export limitation',
    message:
      'This only exports the columns visible in the grid. If you’d like to export everything, use the Export component from the sidebar.',
    variant: 'info',
    icon: 'arrow-down-tray',
    confirmText: 'Accept',
    cancelText: 'Cancel',
  });
  if (!ok) return;

  try {
    deps.api?.exportDataAsCsv();
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error(e);
    deps.alertSvc.showError('Export failed. Please try again.');
  }
}

export function emitImportCsv(emitter: EventEmitter<string>) {
  emitter.emit('');
}
