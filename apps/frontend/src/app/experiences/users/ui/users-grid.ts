import { Component, inject } from '@angular/core';
import { UpdateAuthUserType } from '@common';
import { DataGrid } from '@uxcommon/components/datagrid/datagrid';

import { AbstractAPIService } from '../../../services/api/abstract-api.service';
import { AuthUsersService } from '../services/authusers-service';
import { AuthService } from 'apps/frontend/src/app/auth/auth-service';

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
      plusIcon="add-users"
    ></pc-datagrid>
  `,
  providers: [{ provide: AbstractAPIService, useExisting: AuthUsersService }],
})
export class UsersGridComponent extends DataGrid<'authusers', UpdateAuthUserType> {
  private readonly auth = inject(AuthService);

  private readonly dateFormatter = new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  protected col = [
    { field: 'email', headerName: 'Email', editable: true },
    { field: 'first_name', headerName: 'First Name', editable: true },
    { field: 'last_name', headerName: 'Last Name', editable: true },
    {
      field: 'role',
      headerName: 'Role',
      editable: true,
      cellEditorParams: () => {
        const currentUserRole = this.auth.getUser()?.role;
        const values = [];
        if (currentUserRole !== 'admin') {
          values.push({ value: 'owner', label: 'Owner' });
        }
        values.push({ value: 'admin', label: 'Admin' });
        values.push({ value: 'user', label: 'User' });
        values.push({ value: 'viewer', label: 'Viewer' });
        return { values };
      },
      valueFormatter: (p: any) => {
        const val = p.value ?? p.data?.role;
        if (val === 'owner') return 'Owner';
        if (val === 'admin') return 'Admin';
        if (val === 'user') return 'User';
        if (val === 'viewer') return 'Viewer';
        return val || '';
      },
    },
    {
      field: 'verified',
      headerName: 'Verified',
      editable: false,
      valueFormatter: (p: any) => (this.coerceBoolean(p.value ?? p.data?.verified) ? 'Yes' : 'No'),
      cellRenderer: (p: any) => (this.coerceBoolean(p.value ?? p.data?.verified) ? 'Yes' : 'No'),
    },
    {
      field: 'updated_at',
      headerName: 'Updated',
      hide: true,
      valueFormatter: (p: any) => this.formatDate(p.value ?? p.data?.updated_at),
    },
    {
      field: 'created_at',
      headerName: 'Created',
      hide: true,
      valueFormatter: (p: any) => this.formatDate(p.value ?? p.data?.created_at),
    },
  ];

  constructor() {
    super();
  }

  protected override isCellEditable(row: any, col: any): boolean {
    const isBaseEditable = super.isCellEditable(row, col);
    if (!isBaseEditable) return false;

    const currentUserRole = this.auth.getUser()?.role;

    if (currentUserRole === 'admin') {
      if (row.role === 'owner') {
        if (col.field === 'role' || col.field === 'verified') {
          return false;
        }
      }
    }

    return true;
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
}
