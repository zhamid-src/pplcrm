import { Component } from '@angular/core';
import { UpdateAuthUserType } from '@common';
import { DataGrid } from '@uxcommon/components/datagrid/datagrid';

import { AbstractAPIService } from '../../../services/api/abstract-api.service';
import { AuthUsersService } from '../services/authusers-service';

@Component({
  selector: 'pc-users-grid',
  imports: [DataGrid],
  template: `
    <pc-datagrid
      [colDefs]="col"
      [disableDelete]="true"
      [disableView]="false"
      [disableExport]="true"
      [disableImport]="true"
      [addRoute]="'add'"
      plusIcon="user-plus"
    ></pc-datagrid>
  `,
  providers: [{ provide: AbstractAPIService, useClass: AuthUsersService }],
})
export class UsersGridComponent extends DataGrid<'authusers', UpdateAuthUserType> {
  private readonly dateFormatter = new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  protected col = [
    { field: 'email', headerName: 'Email', editable: true },
    { field: 'first_name', headerName: 'First Name', editable: true },
    { field: 'last_name', headerName: 'Last Name', editable: true },
    { field: 'role', headerName: 'Role', editable: true },
    {
      field: 'verified',
      headerName: 'Verified',
      editable: true,
      valueFormatter: (p: any) => (this.coerceBoolean(p.value ?? p.data?.verified) ? 'Yes' : 'No'),
      cellRenderer: (p: any) => (this.coerceBoolean(p.value ?? p.data?.verified) ? 'Yes' : 'No'),
      cellEditorParams: { values: ['Yes', 'No'] },
      valueSetter: (p: any) => this.verifiedValueSetter(p),
    },
    {
      field: 'updated_at',
      headerName: 'Updated',
      valueFormatter: (p: any) => this.formatDate(p.value ?? p.data?.updated_at),
    },
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

  private coerceBoolean(value: unknown): boolean {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value !== 0;
    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();
      if (['yes', 'true', '1'].includes(normalized)) return true;
      if (['no', 'false', '0'].includes(normalized)) return false;
    }
    return false;
  }

  private verifiedValueSetter(p: any) {
    const bool = this.coerceBoolean(p.newValue ?? p.value);
    if ((p.data as Record<string, any>)['verified'] === bool) return false;
    (p.data as Record<string, any>)['verified'] = bool;
    return true;
  }
}
