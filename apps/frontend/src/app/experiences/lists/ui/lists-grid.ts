import { Component, OnDestroy, effect, inject, untracked, viewChild } from '@angular/core';
import { UpdateListType } from '../../../../../../../libs/common/src';
import { ListsRefreshService } from '@experiences/lists/services/lists-refresh.service';
import { ListsService } from '@experiences/lists/services/lists-service';
import { DataGrid } from '@frontend/shared/components/datagrid/datagrid';
import type { CellParams, ColumnDef as ColDef } from '@frontend/shared/components/datagrid/grid-defaults';
import { AlertService } from '@uxcommon/components/alerts/alert-service';
import { AbstractAPIService } from '../../../services/api/abstract-api.service';
import { provideDataGridConfig } from '@frontend/shared/components/datagrid/datagrid.tokens';
import { getUserErrorMessage } from '@frontend/services/api/user-message';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

@Component({
  selector: 'pc-lists-grid',
  imports: [DataGrid],
  template: `
    <div class="flex flex-col gap-6">
      <pc-datagrid
        #grid
        title="Lists"
        i18n-title
        description="Organize contacts into custom static or dynamic lists for targeted outreach and campaigns."
        i18n-description
        [colDefs]="col"
        [disableDelete]="false"
        [disableView]="false"
        [allowFilter]="false"
        plusIcon="add-list"
        i18n-plusIcon
        addRoute="add"
        i18n-addRoute
      ></pc-datagrid>
    </div>
  `,
  providers: [
    { provide: AbstractAPIService, useExisting: ListsService },
    provideDataGridConfig({ messages: { exportEntity: 'lists', exportFileName: 'lists-export.csv' } }),
  ],
})
export class ListsGridComponent implements OnDestroy {
  private readonly refreshSvc = inject(ListsRefreshService);
  private readonly listsSvc = inject(ListsService);
  private readonly alerts = inject(AlertService);
  private readonly grid = viewChild<DataGrid<'lists', UpdateListType>>('grid');

  constructor() {
    effect(() => {
      const count = this.refreshSvc.refreshCount();
      if (count > 0) {
        void untracked(() => this.grid()?.refresh());
      }
    });
  }

  protected col: ColDef[] = [
    { field: 'name', headerName: 'List Name', editable: true },
    { field: 'description', headerName: 'Description', editable: true },
    {
      field: 'object',
      headerName: 'Target Object',
      valueFormatter: (p: CellParams) => {
        const val = p?.value;
        if (val === 'people') return 'People';
        if (val === 'households') return 'Households';
        return (val as string | undefined) ?? '—';
      },
    },
    {
      field: 'is_dynamic',
      headerName: 'List Type',
      cellRenderer: (p: CellParams) => {
        const isDynamic = p?.data?.['is_dynamic'];
        return isDynamic
          ? `<span class="badge badge-primary font-semibold text-xs py-1 px-2.5 rounded-md shadow-sm">Dynamic</span>`
          : `<span class="badge badge-neutral font-semibold text-xs py-1 px-2.5 rounded-md shadow-sm">Static</span>`;
      },
    },
    {
      field: 'list_size',
      headerName: 'Size',
      valueFormatter: (p: CellParams) => {
        const isDynamic = p?.data?.['is_dynamic'];
        if (isDynamic === true || isDynamic === 'true' || isDynamic === 1) {
          return 'N/A';
        }
        return (p?.value as number | undefined) ?? 0;
      },
    },
    {
      field: 'last_refreshed_at',
      headerName: 'Last Refreshed',
      valueFormatter: (p: CellParams) => {
        const isDynamic = p?.data?.['is_dynamic'];
        if (!isDynamic) return '—';
        if (!p?.value) return 'Never';
        const date = new Date(p.value as string | number | Date);
        if (isNaN(date.getTime())) return 'Never';
        return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
      },
    },
    {
      field: 'refresh_action',
      headerName: 'Refresh',
      cellRenderer: (p: CellParams) => {
        const isDynamic = p?.data?.['is_dynamic'];
        if (!isDynamic) return '—';
        const status = p?.data?.['status'];
        const isLocallyRefreshing = this.refreshingIds.has(String(p?.data?.['id'] ?? ''));
        if (status === 'refreshing' || isLocallyRefreshing) {
          return `
            <div class="flex items-center justify-center h-full w-full">
              <span class="loading loading-ring loading-lg text-primary"></span>
            </div>
          `;
        }
        return `
          <div class="flex items-center justify-center h-full w-full">
            <button class="btn btn-xs btn-circle btn-ghost group" title="Refresh dynamic list">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-4 h-4 group-hover:text-primary group-hover:animate-bounce">
                <path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
              </svg>
            </button>
          </div>
        `;
      },
      onCellClicked: (p: CellParams) => {
        const isDynamic = p?.data?.['is_dynamic'];
        const id = String(p?.data?.['id'] ?? '');
        const isRefreshing = p?.data?.['status'] === 'refreshing' || this.refreshingIds.has(id);
        if (isDynamic && !isRefreshing) {
          void this.refreshList(id, p);
        }
      },
    },
    {
      field: 'updated_at',
      headerName: 'Last Updated',
      valueFormatter: (p: CellParams) => {
        if (!p?.value) return '—';
        const date = new Date(p.value as string | number | Date);
        if (isNaN(date.getTime())) return '—';
        return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
      },
    },
    { field: 'created_by', headerName: 'Created By' },
  ];

  private readonly refreshingIds = new Set<string>();

  private readonly pollIntervals = new Map<string, ReturnType<typeof setInterval>>();

  private async refreshList(id: string, cellParams: CellParams) {
    try {
      this.refreshingIds.add(id);
      // Re-render the cell immediately to show the loading spinner.
      this.refreshCellIfPossible(cellParams);

      this.alerts.showSuccess('Refresh job scheduled in background');
      await this.listsSvc.refreshList(id);
      this.pollRefreshStatus(id);
    } catch (e) {
      this.refreshingIds.delete(id);
      this.refreshCellIfPossible(cellParams);
      this.alerts.showError(getUserErrorMessage(e, 'Could not refresh the list. Please try again.'));
    }
  }

  /** Best-effort refresh of a single grid cell, if the underlying table API supports it. */
  private refreshCellIfPossible(cellParams: unknown): void {
    if (!isRecord(cellParams)) return;
    const api = cellParams['api'];
    if (!isRecord(api) || typeof api['refreshCells'] !== 'function') return;
    (api['refreshCells'] as (opts: unknown) => void)({
      rowNodes: [cellParams['node']],
      columns: ['refresh_action'],
      force: true,
    });
  }

  private pollRefreshStatus(id: string) {
    const existing = this.pollIntervals.get(id);
    if (existing) clearInterval(existing);

    const interval = setInterval(() => void this.pollRefreshStep(id, interval), 1500);

    this.pollIntervals.set(id, interval);
  }

  private async pollRefreshStep(id: string, interval: ReturnType<typeof setInterval>): Promise<void> {
    try {
      const list = await this.listsSvc.getById(id);
      if (isRecord(list) && list['status'] !== 'refreshing') {
        clearInterval(interval);
        this.pollIntervals.delete(id);
        this.refreshingIds.delete(id);
        if (isRecord(list) && list['status'] === 'failed') {
          this.alerts.showError('List refresh failed in background');
        } else {
          this.alerts.showSuccess('List refreshed successfully');
        }
        void this.grid()?.refresh();
      }
    } catch {
      clearInterval(interval);
      this.pollIntervals.delete(id);
      this.refreshingIds.delete(id);
    }
  }

  public ngOnDestroy() {
    for (const interval of this.pollIntervals.values()) {
      clearInterval(interval);
    }
  }
}
