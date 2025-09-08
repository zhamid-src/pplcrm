import { AbstractAPIService } from '@services/api/abstract-api.service';
import type { ConfirmDialogService } from '@services/shared-dialog.service';
import type { AlertService } from '@uxcommon/components/alerts/alert-service';
import type { loadingGate } from '@uxcommon/loading-gate';

// GridApi removed (AG Grid no longer used)

import { DataGridConfig } from './datagrid.tokens';
import { get, set } from 'idb-keyval';
// AG-specific helpers removed

type DeleteCtx = {
  alertSvc: AlertService;
  api?: any; // ignored (AG Grid removed)
  config: DataGridConfig;
  dialogs: ConfirmDialogService;
  gridSvc: AbstractAPIService<any, any>;
  mergedGridOptions?: any; // ignored
  rowModelType?: 'clientSide' | 'serverSide'; // ignored
  _loading: loadingGate;

  getSelectedRows: () => (Partial<any> & { id: string })[];
};

export async function confirmDeleteAndRun(ctx: DeleteCtx): Promise<void> {
  const { messages } = ctx.config;

  const selectedCount = ctx.getSelectedRows()?.length ?? 0;
  const dynamicMessage = selectedCount
    ? `${selectedCount} row(s) will be deleted permanently. You cannot undo this.`
    : ctx.config.messages.deleteConfirmMessage;

  const ok = await ctx.dialogs.confirm({
    title: messages.deleteConfirmTitle,
    message: dynamicMessage,
    variant: messages.deleteConfirmVariant,
    icon: messages.deleteConfirmIcon,
    confirmText: messages.deleteConfirmText,
    cancelText: messages.deleteCancelText,
    allowBackdropClose: false,
  });
  if (!ok) return;

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

  const end = ctx._loading.begin();
  try {
    const ids = deletableRows.map((r) => r.id);
    const ok2 = await ctx.gridSvc.deleteMany(ids);
    if (!ok2) {
      ctx.alertSvc.showError(messages.deleteFailed);
      return;
    }

    // With AG Grid removed, UI refresh is handled by caller
    ctx.alertSvc.showSuccess(messages.deleteSuccess);
  } finally {
    end();
  }
}

export async function doExportCsv(deps: {
  dialogs: ConfirmDialogService;
  api?: any;
  alertSvc: AlertService;
  config: DataGridConfig;
  getRowsForExport?: () => Array<Record<string, any>>;
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
    // Track export job in IndexedDB (lightweight client-side history)
    const jobs = ((await get('pc_export_jobs')) as any[]) || [];
    const job = { id: crypto.randomUUID(), name: 'Grid CSV Export', status: 'in_progress', created_at: Date.now() };
    jobs.push(job);
    await set('pc_export_jobs', jobs);

    if (deps.api?.exportDataAsCsv) {
      deps.api.exportDataAsCsv();
    } else if (deps.getRowsForExport) {
      const rows = deps.getRowsForExport() || [];
      if (!rows.length) return;
      const headers = Object.keys(rows[0]);
      const escape = (v: any) => {
        const s = v == null ? '' : String(v);
        return s.includes(',') || s.includes('"') || s.includes('\n') ? '"' + s.replace(/"/g, '""') + '"' : s;
      };
      const csv = [headers.join(',')]
        .concat(rows.map((r) => headers.map((h) => escape((r as any)[h])).join(',')))
        .join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'export.csv';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }

    // Mark as completed
    const jobs2 = ((await get('pc_export_jobs')) as any[]) || [];
    const idx = jobs2.findIndex((j) => j.id === job.id);
    if (idx >= 0) {
      jobs2[idx] = { ...jobs2[idx], status: 'completed' };
      await set('pc_export_jobs', jobs2);
    }
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error(e);
    deps.alertSvc.showError(messages.exportFailed);
    // Best-effort: mark last job as failed
    try {
      const jobs = ((await get('pc_export_jobs')) as any[]) || [];
      const last = jobs[jobs.length - 1];
      if (last && last.status === 'in_progress') {
        last.status = 'failed';
        await set('pc_export_jobs', jobs);
      }
    } catch {}
  }
}
