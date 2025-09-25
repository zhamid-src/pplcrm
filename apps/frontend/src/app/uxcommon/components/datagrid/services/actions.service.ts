import { Injectable } from '@angular/core';
import type { ConfirmDialogService } from '../../../../services/shared-dialog.service';
import type { AlertService } from '../../alerts/alert-service';
import type { loadingGate } from '../../../loading-gate';

import { get, set } from 'idb-keyval';

import { DataGridConfig } from '../datagrid.tokens';

type ExportJob = {
  id: string;
  name: string;
  status: 'in_progress' | 'completed' | 'failed';
  created_at: number;
  details?: string;
};

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

    const isNonDeletable = (row: Record<string, unknown>) => {
      if (!('deletable' in row)) return false;
      const value = (row as { deletable?: unknown }).deletable;
      if (typeof value === 'boolean') return value === false;
      if (typeof value === 'string') {
        const normalized = value.trim().toLowerCase();
        return normalized === 'false' || normalized === '0';
      }
      if (typeof value === 'number') return value === 0;
      return false;
    };

    const deletableRows = rows.filter((row) => !isNonDeletable(row as Record<string, unknown>));
    const containsNonDeletable = deletableRows.length !== rows.length;
    if (containsNonDeletable) {
      ctx.alertSvc.showError(messages.deleteSystemValues);
      return;
    }
    if (!deletableRows.length) {
      return;
    }

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
    requestFullExport?: () => Promise<{ csv: string; fileName?: string; rowCount?: number }>;
    displayedCount?: number;
    totalCount?: number;
  }) {
    const { messages } = deps.config;

    const displayedCount = deps.displayedCount ?? 0;
    const totalCount = deps.totalCount ?? displayedCount;
    const hasAllRowsVisible = totalCount <= displayedCount;

    let exportAllData = false;
    if (!hasAllRowsVisible) {
      const parts: string[] = [];
      if (totalCount > 0 && displayedCount > 0) {
        parts.push(`Only ${displayedCount} of ${totalCount} rows are currently displayed.`);
      }
      parts.push(messages.exportMessage);
      parts.push(messages.exportNavigateWarning);
      const wantsAll = await deps.dialogs.confirm({
        title: messages.exportTitle,
        message: parts.filter(Boolean).join('\n\n'),
        variant: 'info',
        icon: messages.exportIcon,
        confirmText: messages.exportConfirmText,
        cancelText: messages.exportCancelText,
        allowBackdropClose: false,
      });
      exportAllData = wantsAll === true;
    }

    if (!exportAllData && !deps.getRowsForExport) return;
    if (exportAllData && !deps.requestFullExport) {
      if (deps.getRowsForExport) {
        exportAllData = false;
      } else {
        deps.alertSvc.showError(messages.exportFailed);
        return;
      }
    }

    let currentJobId: string | null = null;
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
      currentJobId = job.id;
      let csv = '';
      let fileName = messages.exportFileName;
      let rowCount = 0;
      if (exportAllData && deps.requestFullExport) {
        deps.alertSvc.showInfo(messages.exportInProgress);
        const result = await deps.requestFullExport();
        csv = result?.csv ?? '';
        fileName = (result?.fileName && result.fileName.trim()) || fileName;
        rowCount = result?.rowCount ?? 0;
      } else {
        const rows = deps.getRowsForExport?.() ?? [];
        if (!rows.length) {
          await this.markJobCompleted(job.id, 'completed', 'No rows to export');
          return;
        }
        rowCount = rows.length;
        const headers = Object.keys(rows[0]);
        const escape = (v: any) => {
          const s = v == null ? '' : String(v);
          return s.includes(',') || s.includes('"') || s.includes('\n') ? '"' + s.replace(/"/g, '""') + '"' : s;
        };
        csv = [headers.join(',')]
          .concat(rows.map((r) => headers.map((h) => escape((r as Record<string, unknown>)[h])).join(',')))
          .join('\n');
      }

      if (!csv) {
        await this.markJobCompleted(job.id, 'failed', 'Export returned no data');
        deps.alertSvc.showError(messages.exportFailed);
        return;
      }

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName || 'grid-export.csv';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      deps.alertSvc.showSuccess(messages.exportReady);
      const detail = exportAllData
        ? rowCount ? `All rows (${rowCount})` : 'All rows'
        : `Displayed rows (${rowCount})`;
      await this.markJobCompleted(job.id, 'completed', detail);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e);
      deps.alertSvc.showError(messages.exportFailed);
      if (currentJobId) {
        await this.markJobCompleted(currentJobId, 'failed', 'Export failed');
      }
      try {
        const jobs = ((await get('pc_export_jobs')) as unknown as ExportJob[]) || [];
        const last = jobs[jobs.length - 1];
        if (last && last.status === 'in_progress') {
          last.status = 'failed';
          last.details = 'Export failed';
          await set('pc_export_jobs', jobs);
        }
      } catch {}
    }
  }

  private async markJobCompleted(id: string, status: ExportJob['status'], details?: string): Promise<void> {
    try {
      const jobs = ((await get('pc_export_jobs')) as unknown as ExportJob[]) || [];
      const idx = jobs.findIndex((j) => j.id === id);
      if (idx >= 0) {
        jobs[idx] = { ...jobs[idx], status, details };
        await set('pc_export_jobs', jobs);
      }
    } catch {}
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
