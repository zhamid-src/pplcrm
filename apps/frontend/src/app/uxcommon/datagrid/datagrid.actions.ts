import type { AlertService } from '@uxcommon/alerts/alert-service';
import type { ConfirmDialogService } from '@uxcommon/shared-dialog-service';

import type { GridApi } from 'ag-grid-community';

import type { AbstractAPIService } from '../../services/api/abstract-api.service';
import type { DataGridConfig } from './datagrid.tokens';
import { bucketByRoute } from './datagrid.utils';

type DeleteCtx = {
  alertSvc: AlertService;
  api: GridApi | undefined;
  config: DataGridConfig;
  dialogs: ConfirmDialogService;
  gridSvc: AbstractAPIService<any, any>;
  mergedGridOptions: any;
  rowModelType: 'clientSide' | 'serverSide';

  getSelectedRows: () => (Partial<any> & { id: string })[];
};

export async function confirmDeleteAndRun(ctx: DeleteCtx): Promise<void> {
  const { messages } = ctx.config;

  const ok = await ctx.dialogs.confirm({
    title: messages.deleteConfirmTitle,
    message: messages.deleteConfirmMessage,
    variant: messages.deleteConfirmVariant,
    icon: messages.deleteConfirmIcon,
    confirmText: messages.deleteConfirmText,
    cancelText: messages.deleteCancelText,
    allowBackdropClose: false,
  });
  if (!ok) return;

  const api = ctx.api;
  if (!api) return;

  const rows = ctx.getSelectedRows();
  if (!rows.length) {
    ctx.alertSvc.showError(messages.deleteNoneSelected);
    return;
  }

  const deletableRows = rows.filter((row) => !('deletable' in row) || (row as any).deletable !== false);
  if (deletableRows.length !== rows.length) {
    ctx.alertSvc.showError(messages.deleteSystemValues);
  }
  if (!deletableRows.length) return;

  api.setGridOption('loading', true);
  try {
    const ids = deletableRows.map((r) => r.id);
    const ok2 = await ctx.gridSvc.deleteMany(ids);
    if (!ok2) {
      ctx.alertSvc.showError(messages.deleteFailed);
      return;
    }

    const isClient = ctx.rowModelType === 'clientSide';
    const idSet = new Set(ids.map(String));
    const hasGetRowId = !!ctx.mergedGridOptions?.getRowId;

    if (isClient) {
      if (hasGetRowId) {
        api.applyTransaction({ remove: ids.map((id) => ({ id })) as any[] });
      } else {
        const nodes = api.getSelectedNodes().filter((n) => n.data && idSet.has(String((n.data as any).id)));
        const removeRows = nodes.map((n) => n.data!).filter(Boolean) as any[];
        api.applyTransaction({ remove: removeRows });
      }
    } else {
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
    ctx.alertSvc.showSuccess(messages.deleteSuccess);
  } finally {
    api.setGridOption('loading', false);
  }
}

export async function doExportCsv(deps: {
  dialogs: ConfirmDialogService;
  api: GridApi | undefined;
  alertSvc: AlertService;
  config: DataGridConfig;
}) {
  const { messages } = deps.config;

  const ok = await deps.dialogs.confirm({
    title: messages.exportTitle,
    message: messages.exportMessage,
    variant: 'info',
    icon: messages.exportIcon,
    confirmText: messages.exportConfirmText,
    cancelText: messages.exportCancelText,
  });
  if (!ok) return;

  try {
    deps.api?.exportDataAsCsv();
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error(e);
    deps.alertSvc.showError(messages.exportFailed);
  }
}
