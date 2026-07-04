import { Component, inject } from '@angular/core';
import { escapeHtml } from '../../../../../../../libs/common/src';
import { UserService } from '@frontend/services/user.service';
import { DataGrid } from '@frontend/shared/components/datagrid/datagrid';
import { provideDataGridConfig } from '@frontend/shared/components/datagrid/datagrid.tokens';
import type { CellParams, ColumnDef as ColDef } from '@frontend/shared/components/datagrid/grid-defaults';
import type { GridRow } from '@frontend/shared/components/datagrid/types';
import { AuthService } from 'apps/frontend/src/app/auth/auth-service';
import { AbstractAPIService } from '../../../services/api/abstract-api.service';
import { UserAdminService } from '../services/useradmin-service';

@Component({
  selector: 'pc-users-grid',
  imports: [DataGrid],
  template: `
    <div class="flex flex-col gap-6">
      <pc-datagrid
        #grid
        title="Users"
        i18n-title
        description="Manage administrator and staff user accounts, assign security roles, and monitor system access."
        i18n-description
        [colDefs]="col"
        [disableDelete]="true"
        [disableView]="false"
        [disableExport]="true"
        [disableImport]="true"
        [allowFilter]="false"
        [addRoute]="'add'"
        plusIcon="add-users"
        i18n-plusIcon
        [isCellEditableOverride]="isCellEditableBind"
      ></pc-datagrid>
    </div>
  `,
  providers: [
    { provide: AbstractAPIService, useExisting: UserAdminService },
    provideDataGridConfig({ messages: { exportEntity: 'users', exportFileName: 'users-export.csv' } }),
  ],
})
export class UsersGridComponent {
  private readonly auth = inject(AuthService);
  private readonly userService = inject(UserService);

  private readonly dateFormatter = new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  protected col: ColDef[] = [
    {
      field: 'email',
      headerName: 'Email',
      editable: true,
      cellRenderer: (p: CellParams) => {
        let avatarUrl = (p.data?.['avatar_url'] as string | null | undefined) ?? null;
        const firstName = (p.data?.['first_name'] as string | undefined) ?? '';
        const lastName = (p.data?.['last_name'] as string | undefined) ?? '';
        const name = [firstName, lastName].filter(Boolean).join(' ') || String(p.value ?? '') || '?';
        const emailVal = String(p.value ?? '');

        let avatarHtml = '';
        if (avatarUrl) {
          avatarUrl = this.userService.resolveAvatarUrl(avatarUrl);
          // Names and avatar URLs are user-controlled — escape before interpolating into HTML
          avatarHtml = `<img src="${escapeHtml(avatarUrl ?? '')}" alt="${escapeHtml(name)}" class="w-5 h-5 rounded-full object-cover ring-1 ring-base-200" />`;
        } else {
          const PALETTES = [
            'bg-indigo-500/20 text-indigo-700',
            'bg-teal-500/20 text-teal-700',
            'bg-purple-500/20 text-purple-700',
            'bg-rose-500/20 text-rose-700',
            'bg-amber-500/20 text-amber-700',
            'bg-emerald-500/20 text-emerald-700',
            'bg-blue-500/20 text-blue-700',
            'bg-orange-500/20 text-orange-700',
            'bg-pink-500/20 text-pink-700',
            'bg-cyan-500/20 text-cyan-700',
          ];
          let sum = 0;
          for (let i = 0; i < name.length; i++) sum += name.charCodeAt(i);
          const colorClass = PALETTES[sum % PALETTES.length];
          const parts = name.split(/\s+/);
          const first = parts[0];
          const last = parts[parts.length - 1];
          const initials =
            parts.length >= 2 && first && last
              ? (first.charAt(0) + last.charAt(0)).toUpperCase()
              : name.charAt(0).toUpperCase();
          avatarHtml = `<div class="w-5 h-5 rounded-full ${colorClass} flex items-center justify-center font-bold text-[10px] ring-1 ring-base-200">
            <span>${escapeHtml(initials)}</span>
          </div>`;
        }

        return `<div class="flex items-center gap-2 py-0.5 h-full">
          ${avatarHtml}
          <span>${escapeHtml(emailVal)}</span>
        </div>`;
      },
    },
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
      valueFormatter: (p: CellParams) => {
        const val = p.value ?? p.data?.['role'];
        if (val === 'owner') return 'Owner';
        if (val === 'admin') return 'Admin';
        if (val === 'user') return 'User';
        if (val === 'viewer') return 'Viewer';
        return (val as string | undefined) || '';
      },
    },
    {
      field: 'verified',
      headerName: 'Verified',
      editable: false,
      valueFormatter: (p: CellParams) => (this.coerceBoolean(p.value ?? p.data?.['verified']) ? 'Yes' : 'No'),
      cellRenderer: (p: CellParams) => (this.coerceBoolean(p.value ?? p.data?.['verified']) ? 'Yes' : 'No'),
    },
    {
      field: 'updated_at',
      headerName: 'Updated',
      hide: true,
      valueFormatter: (p: CellParams) => this.formatDate(p.value ?? p.data?.['updated_at']),
    },
    {
      field: 'created_at',
      headerName: 'Created',
      hide: true,
      valueFormatter: (p: CellParams) => this.formatDate(p.value ?? p.data?.['created_at']),
    },
  ];

  public readonly isCellEditableBind = (row: GridRow, col: ColDef): boolean => {
    if (!col.editable) return false;

    const currentUserRole = this.auth.getUser()?.role;

    if (currentUserRole === 'admin') {
      if (row['role'] === 'owner') {
        if (col.field === 'role' || col.field === 'verified') {
          return false;
        }
      }
    }

    return true;
  };

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
