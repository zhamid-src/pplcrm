import { Component } from '@angular/core';
import { UpdateMarketingEmailType } from '@common';
import { DataGrid } from '@uxcommon/components/datagrid/datagrid';

import { AbstractAPIService } from '../../../services/api/abstract-api.service';
import { NewslettersService } from '../services/newsletters-service';

@Component({
  selector: 'pc-newsletters-grid',
  imports: [DataGrid],
  template: `
    <pc-datagrid
      [colDefs]="col"
      [disableDelete]="true"
      [disableView]="false"
      [disableImport]="true"
      [disableExport]="false"
      [addRoute]="'add'"
      plusIcon="add-notes"
    ></pc-datagrid>
  `,
  providers: [{ provide: AbstractAPIService, useClass: NewslettersService }],
})
export class NewslettersGridComponent extends DataGrid<'newsletters', UpdateMarketingEmailType> {
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

  protected col = [
    { field: 'name', headerName: 'Newsletter name' },
    {
      field: 'status',
      headerName: 'Status',
      valueFormatter: (p: any) => this.formatStatus(p.value ?? p.data?.status),
    },
    {
      field: 'updated_at',
      headerName: 'Last updated at',
      valueFormatter: (p: any) => this.formatDate(p.value ?? p.data?.updated_at),
    },
    {
      field: 'delivered_count',
      headerName: 'Delivered',
      valueFormatter: (p: any) => this.formatCount(p.value ?? p.data?.delivered_count),
    },
    {
      field: 'total_recipients',
      headerName: 'Recipients',
      valueFormatter: (p: any) => this.formatCount(p.value ?? p.data?.total_recipients),
    },
    {
      field: 'open_rate',
      headerName: 'Open rate',
      valueFormatter: (p: any) => this.formatPercent(p.value ?? p.data?.open_rate),
    },
    {
      field: 'click_rate',
      headerName: 'Click rate',
      valueFormatter: (p: any) => this.formatPercent(p.value ?? p.data?.click_rate),
    },
    {
      field: 'send_date',
      headerName: 'Send date',
      valueFormatter: (p: any) => this.formatDate(p.value ?? p.data?.send_date),
    },
  ];

  constructor() {
    super();
  }

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
