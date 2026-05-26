import { Component, ChangeDetectionStrategy } from '@angular/core';
import { DataGrid } from '@uxcommon/components/datagrid/datagrid';
import { AbstractAPIService } from '../../../services/api/abstract-api.service';
import { CompaniesService } from '../services/companies-service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'pc-companies-grid',
  imports: [DataGrid],
  template: `
    <pc-datagrid
      [colDefs]="col"
      [disableDelete]="false"
      [disableView]="false"
      [disableExport]="true"
      [disableImport]="true"
      [addRoute]="'add'"
      plusIcon="plus"
    ></pc-datagrid>
  `,
  providers: [{ provide: AbstractAPIService, useExisting: CompaniesService }],
})
export class CompaniesGrid extends DataGrid<'companies', any> {
  private readonly dateFormatter = new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  protected col = [
    { field: 'name', headerName: 'Company Name', editable: true },
    { field: 'website', headerName: 'Website', editable: true },
    { field: 'industry', headerName: 'Industry', editable: true },
    { field: 'email', headerName: 'Email', editable: true },
    { field: 'phone', headerName: 'Phone', editable: true },
    { field: 'description', headerName: 'Description', editable: true },
    {
      field: 'created_at',
      headerName: 'Created',
      valueFormatter: (p: any) => this.formatDate(p.value ?? p.data?.created_at),
    },
  ];

  constructor() {
    super();
  }

  private formatDate(value: unknown): string {
    if (!value) return '';
    const date = value instanceof Date ? value : new Date(value as string);
    if (Number.isNaN(date.getTime())) return '';
    return this.dateFormatter.format(date);
  }
}
