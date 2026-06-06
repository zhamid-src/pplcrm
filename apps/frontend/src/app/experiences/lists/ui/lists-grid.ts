/**
 * Grid component for viewing and editing lists of people or households.
 */
import { Component, effect, inject, untracked } from '@angular/core';
import { UpdateListType } from '@common';
import { ListsRefreshService } from '@experiences/lists/services/lists-refresh.service';
import { ListsService } from '@experiences/lists/services/lists-service';
import { DataGrid } from '@uxcommon/components/datagrid/datagrid';
import { AlertService } from '@uxcommon/components/alerts/alert-service';
import { GridHeaderComponent } from '@uxcommon/components/grid-header/grid-header';

import { AbstractAPIService } from '../../../services/api/abstract-api.service';

@Component({
  selector: 'pc-lists-grid',
  imports: [DataGrid, GridHeaderComponent],
  template: `
    <div class="flex flex-col gap-6">
      <!-- Title Header -->
      <pc-grid-header
        title="Lists"
        description="Organize contacts into custom static or dynamic lists for targeted outreach and campaigns."
      ></pc-grid-header>

      <pc-datagrid
        [colDefs]="col"
        [disableDelete]="false"
        [disableView]="false"
        [allowFilter]="false"
        [disableAdvancedFilter]="true"
        plusIcon="add-list"
        addRoute="add"
      ></pc-datagrid>
    </div>
  `,
  providers: [{ provide: AbstractAPIService, useExisting: ListsService }],
})
export class ListsGridComponent extends DataGrid<'lists', UpdateListType> {
  private readonly refreshSvc = inject(ListsRefreshService);
  private readonly listsSvc = inject(ListsService);
  private readonly alerts = inject(AlertService);

  constructor() {
    super();
    effect(() => {
      const count = this.refreshSvc.refreshCount();
      if (count > 0) {
        untracked(() => this.refresh());
      }
    });
  }

  protected col = [
    { field: 'id', headerName: 'ID' },
    { field: 'name', headerName: 'List Name', editable: true },
    { field: 'description', headerName: 'Description', editable: true },
    {
      field: 'object',
      headerName: 'Target Object',
      valueFormatter: (p: any) => {
        const val = p?.value;
        if (val === 'people') return 'People';
        if (val === 'households') return 'Households';
        return val ?? '—';
      },
    },
    {
      field: 'is_dynamic',
      headerName: 'List Type',
      cellRenderer: (p: any) => {
        const isDynamic = p?.data?.is_dynamic;
        return isDynamic
          ? `<span class="badge badge-primary font-semibold text-xs py-1 px-2.5 rounded-md shadow-sm">Dynamic</span>`
          : `<span class="badge badge-neutral font-semibold text-xs py-1 px-2.5 rounded-md shadow-sm">Static</span>`;
      },
    },
    {
      field: 'list_size',
      headerName: 'Size',
      valueFormatter: (p: any) => {
        const isDynamic = p?.data?.is_dynamic;
        if (isDynamic === true || isDynamic === 'true' || isDynamic === 1) {
          return 'N/A';
        }
        return p?.value ?? 0;
      },
    },
    {
      field: 'last_refreshed_at',
      headerName: 'Last Refreshed',
      valueFormatter: (p: any) => {
        const isDynamic = p?.data?.is_dynamic;
        if (!isDynamic) return '—';
        if (!p?.value) return 'Never';
        const date = new Date(p.value);
        if (isNaN(date.getTime())) return 'Never';
        return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
      },
    },
    {
      field: 'refresh_action',
      headerName: 'Refresh',
      cellRenderer: (p: any) => {
        const isDynamic = p?.data?.is_dynamic;
        if (!isDynamic) return '—';
        const status = p?.data?.status;
        if (status === 'refreshing') {
          return `
            <div class="flex items-center justify-center h-full">
              <svg class="animate-spin h-4 w-4 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
          `;
        }
        return `
          <button class="btn btn-xs btn-circle btn-primary btn-outline flex items-center justify-center hover:scale-105 transition-transform" title="Refresh dynamic list">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-3.5 h-3.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
          </button>
        `;
      },
      onCellClicked: (p: any) => {
        const isDynamic = p?.data?.is_dynamic;
        const isRefreshing = p?.data?.status === 'refreshing';
        if (isDynamic && !isRefreshing) {
          void this.refreshList(p.data.id);
        }
      },
    },
    {
      field: 'updated_at',
      headerName: 'Last Updated',
      valueFormatter: (p: any) => {
        if (!p?.value) return '—';
        const date = new Date(p.value);
        if (isNaN(date.getTime())) return '—';
        return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
      },
    },
    { field: 'created_by', headerName: 'Created By' },
  ];

  private async refreshList(id: string) {
    try {
      this.alerts.showSuccess('Refresh job scheduled in background');
      await this.listsSvc.refreshList(id);
      await this.refresh();
    } catch (e: any) {
      this.alerts.showError(e?.message ?? String(e));
    }
  }
}
