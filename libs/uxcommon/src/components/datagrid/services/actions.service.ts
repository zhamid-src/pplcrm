import { Injectable } from '@angular/core';
import type { ConfirmDialogService } from '@frontend/services/shared-dialog.service';
import type { AlertService } from '../../alerts/alert-service';
import type { loadingGate } from '../../../loading-gate';

import { DataGridConfig } from '../datagrid.tokens';

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
    /** Synchronous full export (legacy, used only for displayed-count path) */
    requestFullExport?: () => Promise<{ csv: string; fileName?: string; rowCount?: number }>;
    /** Queue a background export job. When provided, used for the "all rows" path. */
    queueFullExport?: () => Promise<void>;
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

    // --- "All rows" path: queue background job, return immediately ---
    if (exportAllData) {
      if (deps.queueFullExport) {
        try {
          await deps.queueFullExport();
          deps.alertSvc.showSuccess('Export queued! Visit the Exports page to download when ready.');
        } catch {
          deps.alertSvc.showError(messages.exportFailed);
        }
        return;
      }
      // fallback: no queue callback, fall through to synchronous path
    }

    // --- "Displayed rows" path: synchronous, in-memory, direct download ---
    if (!deps.getRowsForExport) return;

    try {
      const rows = deps.getRowsForExport();
      if (!rows.length) {
        deps.alertSvc.showInfo('No rows to export.');
        return;
      }
      const rowCount = rows.length;
      const headers = Object.keys(rows[0]);
      const escape = (v: any) => {
        const s = v == null ? '' : String(v);
        return s.includes(',') || s.includes('"') || s.includes('\n') ? '"' + s.replace(/"/g, '""') + '"' : s;
      };
      const csv = [headers.join(',')]
        .concat(rows.map((r) => headers.map((h) => escape((r as Record<string, unknown>)[h])).join(',')))
        .join('\n');

      const fileName = messages.exportFileName || 'export.csv';
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      deps.alertSvc.showSuccess(`${messages.exportReady} (${rowCount} rows)`);
    } catch {
      deps.alertSvc.showError(messages.exportFailed);
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
