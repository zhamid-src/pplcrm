import { Component, viewChild } from '@angular/core';
import { DataGrid } from '@frontend/shared/components/datagrid/datagrid';
import type { CellParams, ColumnDef as ColDef } from '@frontend/shared/components/datagrid/grid-defaults';
import { UpdateMarketingEmailType } from '../../../../../../../libs/common/src';

import { provideDataGridConfig } from '@frontend/shared/components/datagrid/datagrid.tokens';
import { AbstractAPIService } from '../../../services/api/abstract-api.service';
import { NewslettersService } from '../services/newsletters-service';
import { NewslettersDashboardComponent } from './newsletters-dashboard';

@Component({
  selector: 'pc-newsletters-grid',
  imports: [DataGrid, NewslettersDashboardComponent],
  template: `
    <div class="flex flex-col gap-6">
      <pc-newsletters-dashboard [rows]="grid?.rows() ?? []"></pc-newsletters-dashboard>

      <pc-datagrid
        #grid
        [colDefs]="col"
        [disableDelete]="true"
        [disableView]="false"
        [disableImport]="true"
        [disableExport]="false"
        [allowFilter]="false"
        [addRoute]="'add'"
        plusIcon="add-newsletter"
        i18n-plusIcon
      ></pc-datagrid>
    </div>
  `,
  providers: [
    { provide: AbstractAPIService, useExisting: NewslettersService },
    provideDataGridConfig({ messages: { exportEntity: 'newsletters', exportFileName: 'newsletters-export.csv' } }),
  ],
})
export class NewslettersGridComponent {
  protected readonly grid = viewChild<DataGrid<'newsletters', UpdateMarketingEmailType>>('grid');

  private readonly countFormatter = new Intl.NumberFormat(undefined, {
    maximumFractionDigits: 0,
  });
  private readonly dateFormatter = new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  private readonly percentFormatter = new Intl.NumberFormat(undefined, {
    maximumFractionDigits: 1,
    minimumFractionDigits: 0,
  });

  protected col: ColDef[] = [
    { field: 'name', headerName: 'Newsletter name' },
    {
      field: 'status',
      headerName: 'Status',
      valueFormatter: (p: CellParams) => this.formatStatus(p.value ?? p.data?.['status']),
    },
    {
      field: 'updated_at',
      headerName: 'Last updated at',
      valueFormatter: (p: CellParams) => this.formatDate(p.value ?? p.data?.['updated_at']),
    },
    {
      field: 'delivered_count',
      headerName: 'Delivered',
      valueFormatter: (p: CellParams) => this.formatCount(p.value ?? p.data?.['delivered_count']),
    },
    {
      field: 'total_recipients',
      headerName: 'Recipients',
      valueFormatter: (p: CellParams) => this.formatCount(p.value ?? p.data?.['total_recipients']),
    },
    {
      field: 'open_rate',
      headerName: 'Open rate',
      valueFormatter: (p: CellParams) => this.formatPercent(p.value ?? p.data?.['open_rate']),
    },
    {
      field: 'click_rate',
      headerName: 'Click rate',
      valueFormatter: (p: CellParams) => this.formatPercent(p.value ?? p.data?.['click_rate']),
    },
    {
      field: 'send_date',
      headerName: 'Send date',
      valueFormatter: (p: CellParams) => this.formatDate(p.value ?? p.data?.['send_date']),
    },
  ];

  private formatCount(value: unknown): string {
    const num = Number(value);
    return Number.isFinite(num) ? this.countFormatter.format(num) : '--';
  }

  private formatDate(value: unknown): string {
    if (!value) return '--';
    const date = value instanceof Date ? value : new Date(value as string);
    if (Number.isNaN(date.getTime())) return '--';
    return this.dateFormatter.format(date);
  }

  private formatPercent(value: unknown): string {
    const num = Number(value);
    if (!Number.isFinite(num)) return '--';
    return `${this.percentFormatter.format(num)}%`;
  }

  private formatStatus(value: unknown): string {
    if (!value) return '--';
    const text = String(value).trim();
    if (!text) return '--';
    return text.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }
}
