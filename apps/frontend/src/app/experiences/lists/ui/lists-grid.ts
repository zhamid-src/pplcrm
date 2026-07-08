import { Component, OnDestroy, OnInit, computed, effect, inject, signal, untracked, viewChild } from '@angular/core';
import { Router } from '@angular/router';
import { UpdateListType } from '../../../../../../../libs/common/src';
import { ListsRefreshService } from '@experiences/lists/services/lists-refresh.service';
import { ListsService } from '@experiences/lists/services/lists-service';
import { describeListDefinition } from '@experiences/lists/services/list-definition';
import { DataGrid } from '@frontend/shared/components/datagrid/datagrid';
import type { CellParams, ColumnDef as ColDef } from '@frontend/shared/components/datagrid/grid-defaults';
import { AlertService } from '@uxcommon/components/alerts/alert-service';
import { AbstractAPIService } from '../../../services/api/abstract-api.service';
import { provideDataGridConfig } from '@frontend/shared/components/datagrid/datagrid.tokens';
import { getUserErrorMessage } from '@frontend/services/api/user-message';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function formatDateTime(value: unknown): string {
  if (value == null) return '—';
  const date = new Date(value as string | number | Date);
  if (isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

@Component({
  selector: 'pc-lists-grid',
  imports: [DataGrid],
  template: `
    <div class="flex flex-col gap-4">
      <!-- Where am I going? The grain sentence carries the numbers before clicks (§1). -->
      <p class="text-sm text-base-content/70 tabular-nums" data-testid="lists-summary">{{ summarySentence() }}</p>

      <pc-datagrid
        #grid
        title="Lists"
        i18n-title
        description="Reusable audiences for outreach, canvassing and forms — smart lists that refresh themselves or static snapshots you curate."
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

      <!-- Footer explainer (verbatim §8): narrates what each list type does. -->
      <p class="text-xs leading-relaxed text-base-content/60">
        Smart lists refresh themselves — membership updates automatically as people and households change. Static lists
        run their rules once at creation and save a fixed snapshot; membership only changes when you edit it by hand.
        Opening a list shows it applied on the grid.
      </p>
    </div>
  `,
  providers: [
    { provide: AbstractAPIService, useExisting: ListsService },
    provideDataGridConfig({ messages: { exportEntity: 'lists', exportFileName: 'lists-export.csv' } }),
  ],
})
export class ListsGridComponent implements OnInit, OnDestroy {
  private readonly refreshSvc = inject(ListsRefreshService);
  private readonly listsSvc = inject(ListsService);
  private readonly alerts = inject(AlertService);
  private readonly router = inject(Router);
  private readonly grid = viewChild<DataGrid<'lists', UpdateListType>>('grid');

  /** Counts for the grain sentence — refreshed alongside the grid. */
  private readonly counts = signal<{ total: number; smart: number; static: number }>({ total: 0, smart: 0, static: 0 });

  protected readonly summarySentence = computed<string>(() => {
    const { total, smart, static: staticCount } = this.counts();
    const n = (v: number) => new Intl.NumberFormat().format(v);
    if (total === 0) return 'No lists yet · create a smart list that refreshes itself or a static snapshot';
    const listWord = total === 1 ? 'list' : 'lists';
    return `${n(total)} ${listWord} · ${n(smart)} smart (refresh themselves), ${n(staticCount)} static (fixed snapshots)`;
  });

  constructor() {
    effect(() => {
      const count = this.refreshSvc.refreshCount();
      if (count > 0) {
        untracked(() => {
          void this.grid()?.refresh();
          void this.loadCounts();
        });
      }
    });
  }

  public ngOnInit(): void {
    void this.loadCounts();
  }

  private async loadCounts(): Promise<void> {
    try {
      const result = await this.listsSvc.getAll();
      const rows = isRecord(result) && Array.isArray(result['rows']) ? result['rows'] : [];
      let smart = 0;
      for (const r of rows) {
        if (isRecord(r) && r['is_dynamic'] === true) smart += 1;
      }
      this.counts.set({ total: rows.length, smart, static: rows.length - smart });
    } catch {
      // The grid itself surfaces load errors; the sentence just stays put.
    }
  }

  protected col: ColDef[] = [
    {
      // LIST — the name is the door: opens People/Households with this list
      // applied as a removable chip (§8). withComponentInputBinding() maps the
      // ?listId query param onto the grid's listId input.
      field: 'name',
      headerName: 'List',
      cellRenderer: (p: CellParams) => {
        const name = String(p?.value ?? p?.data?.['name'] ?? 'Untitled list');
        return `<span class="link link-hover text-primary font-medium">${escapeHtml(name)}</span>`;
      },
      onCellClicked: (p: CellParams) => this.openListOnGrid(p?.data),
    },
    { field: 'description', headerName: 'Description', editable: true },
    {
      field: 'is_dynamic',
      headerName: 'Type',
      cellRenderer: (p: CellParams) => {
        const isSmart = p?.data?.['is_dynamic'] === true;
        return isSmart
          ? `<span class="badge badge-primary badge-sm font-semibold">Smart</span>`
          : `<span class="badge badge-neutral badge-sm font-semibold">Static</span>`;
      },
    },
    {
      field: 'object',
      headerName: 'Of',
      valueFormatter: (p: CellParams) => {
        const val = p?.value;
        if (val === 'people') return 'People';
        if (val === 'households') return 'Households';
        return typeof val === 'string' && val ? val : '—';
      },
    },
    {
      field: 'definition',
      headerName: 'Definition',
      valueFormatter: (p: CellParams) => describeListDefinition(p?.data?.['definition']),
    },
    {
      field: 'list_size',
      headerName: 'Members',
      // Right-aligned, tabular figures (§1/§8). Populated for both types.
      valueFormatter: (p: CellParams) => new Intl.NumberFormat().format(Number(p?.value ?? 0)),
    },
    {
      field: 'last_used_in',
      headerName: 'Last used in',
      valueFormatter: (p: CellParams) => {
        const val = p?.value;
        return typeof val === 'string' && val.trim() ? val : 'Not used yet';
      },
    },
    {
      field: 'refresh_action',
      headerName: 'Refresh',
      cellRenderer: (p: CellParams) => {
        const isSmart = p?.data?.['is_dynamic'] === true;
        if (!isSmart) return '—';
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
            <button class="btn btn-xs btn-circle btn-ghost group" title="Refresh smart list">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-4 h-4 group-hover:text-primary group-hover:animate-bounce">
                <path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
              </svg>
            </button>
          </div>
        `;
      },
      onCellClicked: (p: CellParams) => {
        const isSmart = p?.data?.['is_dynamic'] === true;
        const id = String(p?.data?.['id'] ?? '');
        const isRefreshing = p?.data?.['status'] === 'refreshing' || this.refreshingIds.has(id);
        if (isSmart && id && !isRefreshing) {
          void this.refreshList(id, p);
        }
      },
    },
    {
      field: 'last_refreshed_at',
      headerName: 'Last refreshed',
      valueFormatter: (p: CellParams) => {
        const isSmart = p?.data?.['is_dynamic'] === true;
        if (!isSmart) return '—';
        if (!p?.value) return 'Never';
        return formatDateTime(p.value);
      },
    },
    {
      field: 'updated_at',
      headerName: 'Updated',
      valueFormatter: (p: CellParams) => formatDateTime(p?.value),
    },
    { field: 'created_by', headerName: 'Created by' },
  ];

  private readonly refreshingIds = new Set<string>();

  private readonly pollIntervals = new Map<string, ReturnType<typeof setInterval>>();

  /** Open the People/Households grid with this list applied as a chip. */
  private openListOnGrid(data: unknown): void {
    if (!isRecord(data)) return;
    const id = String(data['id'] ?? '');
    if (!id) return;
    const route = data['object'] === 'households' ? '/households' : '/people';
    void this.router.navigate([route], { queryParams: { listId: id } });
  }

  private async refreshList(id: string, cellParams: CellParams): Promise<void> {
    try {
      this.refreshingIds.add(id);
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

  private pollRefreshStatus(id: string): void {
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
        void this.loadCounts();
      }
    } catch {
      clearInterval(interval);
      this.pollIntervals.delete(id);
      this.refreshingIds.delete(id);
    }
  }

  public ngOnDestroy(): void {
    for (const interval of this.pollIntervals.values()) {
      clearInterval(interval);
    }
  }
}
