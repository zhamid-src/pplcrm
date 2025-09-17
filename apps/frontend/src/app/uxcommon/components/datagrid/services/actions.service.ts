import { Injectable } from '@angular/core';
import type { ConfirmDialogService } from '@services/shared-dialog.service';
import type { AlertService } from '@uxcommon/components/alerts/alert-service';
import type { loadingGate } from '@uxcommon/loading-gate';

import { get, set } from 'idb-keyval';

import { DataGridConfig } from '../datagrid.tokens';

type ExportJob = { id: string; name: string; status: 'in_progress' | 'completed' | 'failed'; created_at: number };

@Injectable({ providedIn: 'root' })
export class DataGridActionsService {
  public async confirmDeleteAndRun(ctx: DeleteCtx): Promise<void> {
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

    const deletableRows = rows.filter(
      (row) => !('deletable' in row) || (row as { deletable?: boolean }).deletable !== false,
    );
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
      ctx.alertSvc.showSuccess(messages.deleteSuccess);
    } finally {
      end();
    }
  }

  public async doExportCsv(deps: {
    dialogs: ConfirmDialogService;
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
      const jobs = ((await get('pc_export_jobs')) as unknown as ExportJob[]) || [];
      const job: ExportJob = {
        id: crypto.randomUUID(),
        name: 'Grid CSV Export',
        status: 'in_progress',
        created_at: Date.now(),
      };
      jobs.push(job);
      await set('pc_export_jobs', jobs);

      if (deps.getRowsForExport) {
        const rows = deps.getRowsForExport() || [];
        if (!rows.length) return;
        const headers = Object.keys(rows[0]);
        const escape = (v: any) => {
          const s = v == null ? '' : String(v);
          return s.includes(',') || s.includes('"') || s.includes('\n') ? '"' + s.replace(/"/g, '""') + '"' : s;
        };
        const csv = [headers.join(',')]
          .concat(rows.map((r) => headers.map((h) => escape((r as Record<string, unknown>)[h])).join(',')))
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

      const jobs2 = ((await get('pc_export_jobs')) as unknown as ExportJob[]) || [];
      const idx = jobs2.findIndex((j) => j.id === job.id);
      if (idx >= 0) {
        jobs2[idx] = { ...jobs2[idx], status: 'completed' };
        await set('pc_export_jobs', jobs2);
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e);
      deps.alertSvc.showError(messages.exportFailed);
      try {
        const jobs = ((await get('pc_export_jobs')) as unknown as ExportJob[]) || [];
        const last = jobs[jobs.length - 1];
        if (last && last.status === 'in_progress') {
          last.status = 'failed';
          await set('pc_export_jobs', jobs);
        }
      } catch {}
    }
  }
}

type DeleteCtx = {
  _loading: loadingGate;
  alertSvc: AlertService;
  config: DataGridConfig;
  dialogs: ConfirmDialogService;
  gridSvc: { deleteMany: (ids: string[]) => Promise<boolean> };

  getSelectedRows: () => (Partial<any> & { id: string })[];
};
