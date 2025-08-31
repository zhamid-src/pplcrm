import { Component, OnInit, inject } from '@angular/core';
import { UpdateTaskType } from '@common';
import { TasksService } from '@experiences/tasks/services/tasks-service';
import { DataGrid } from '@uxcommon/components/datagrid/datagrid';
import { AbstractAPIService } from '../../../services/api/abstract-api.service';
import { AuthService } from '../../../auth/auth-service';

@Component({
  selector: 'pc-tasks-grid',
  imports: [DataGrid],
  template: `<pc-datagrid [colDefs]="col" [disableDelete]="false" [disableView]="true"></pc-datagrid>`,
  providers: [{ provide: AbstractAPIService, useClass: TasksService }],
})
export class TasksGrid extends DataGrid<'tasks', UpdateTaskType> implements OnInit {
  private readonly auth = inject(AuthService);
  private usersById = new Map<string, string>();
  private userLabels: string[] = [];
  private userIds: string[] = [];
  private readonly statusOptions = ['todo', 'in_progress', 'blocked', 'done', 'canceled'];
  private readonly statusLabels = ['Todo', 'In Progress', 'Blocked', 'Done', 'Canceled'];
  private readonly priorityOptions = ['low', 'medium', 'high', 'urgent'];
  private readonly priorityLabels = ['Low', 'Medium', 'High', 'Urgent'];

  protected col = [
    { field: 'id', headerName: 'ID' },
    { field: 'name', headerName: 'Task', editable: true },
    { field: 'details', headerName: 'Details', editable: true },
    {
      field: 'status',
      headerName: 'Status',
      editable: true,
      cellRenderer: (p: any) => this.renderStatusBadge(p.value),
      cellEditor: 'agSelectCellEditor',
      cellEditorParams: { values: this.statusLabels },
      valueSetter: (p: any) => {
        const v = this.parseStatusLabel(p.newValue);
        if ((p.data as any).status !== v) {
          (p.data as any).status = v;
          return true;
        }
        return false;
      },
    },
    {
      field: 'priority',
      headerName: 'Priority',
      editable: true,
      cellRenderer: (p: any) => this.renderPriorityBadge(p.value),
      cellEditor: 'agSelectCellEditor',
      cellEditorParams: { values: this.priorityLabels },
      valueSetter: (p: any) => {
        const v = this.parsePriorityLabel(p.newValue);
        if ((p.data as any).priority !== v) {
          (p.data as any).priority = v;
          return true;
        }
        return false;
      },
    },
    {
      field: 'due_at',
      headerName: 'Due',
      editable: true,
      cellEditor: 'agDateStringCellEditor',
      valueGetter: (p: any) => this.toDateOnly(p.data?.due_at ?? p.value),
      valueSetter: (p: any) => {
        const val: string = p.newValue || p.value || '';
        // ensure only YYYY-MM-DD is stored
        const dateOnly = val.length > 10 ? val.slice(0, 10) : val;
        if ((p.data as any).due_at !== dateOnly) {
          (p.data as any).due_at = dateOnly;
          return true;
        }
        return false;
      },
      valueFormatter: (p: any) => this.formatDate(p.value),
      cellClass: (p: any) => (this.isOverdue(p.data) ? 'text-error font-semibold' : undefined),
    },
    {
      field: 'assigned_to',
      headerName: 'Assigned To',
      editable: true,
      valueFormatter: (p: any) => this.userNameForId(p.value),
      cellEditor: 'agSelectCellEditor',
      cellEditorParams: () => ({ values: this.userLabels }),
      valueSetter: (p: any) => {
        const label: string = p.newValue ?? '';
        const idx = this.userLabels.indexOf(label);
        const id = idx >= 0 ? this.userIds[idx] : String(p.newValue ?? '');
        if ((p.data as any).assigned_to !== id) {
          (p.data as any).assigned_to = id;
          return true;
        }
        return false;
      },
    },
    {
      field: 'createdby_id',
      headerName: 'Created By',
      editable: false,
      valueFormatter: (p: any) => this.userNameForId(p.value),
    },
  ];

  constructor() {
    super();
  }

  public override async ngOnInit() {
    await super.ngOnInit();
    try {
      const users = await this.auth.getUsers();
      this.usersById = new Map(users.map((u) => [String(u.id), `${u.first_name}`]));
      this.userIds = users.map((u) => String(u.id));
      this.userLabels = users.map((u) => `${u.first_name}`);
    } catch {
      // ignore; names just won't format
    }
  }

  private userNameForId(id: string | number | null | undefined) {
    if (id === null || id === undefined || id === '') return '';
    const key = String(id);
    return this.usersById.get(key) ?? key;
  }

  private formatDate(value: any) {
    if (!value) return '';
    const d = new Date(this.toDateOnly(value));
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString();
  }

  private toDateOnly(v: any): string {
    if (!v) return '';
    const str = typeof v === 'string' ? v : new Date(v).toISOString();
    return str.length > 10 ? str.slice(0, 10) : str;
  }

  private isOverdue(row: any): boolean {
    if (!row) return false;
    const status = String(row.status ?? '').toLowerCase();
    if (status === 'done' || status === 'canceled') return false;
    const due = this.toDateOnly(row.due_at);
    if (!due) return false;
    const today = this.toDateOnly(new Date());
    // Simple lexical compare works for YYYY-MM-DD
    return due < today;
  }

  private renderStatusBadge(value: string | null | undefined) {
    if (!value) return '';
    const v = String(value);
    const cls =
      v === 'done'
        ? 'badge-success'
        : v === 'in_progress'
          ? 'badge-info'
          : v === 'blocked'
            ? 'badge-error'
            : v === 'canceled'
              ? 'badge-neutral'
              : 'badge-ghost';
    const label = this.toTitle(v);
    return `<span class="badge ${cls} badge-sm">${label}</span>`;
  }

  private renderPriorityBadge(value: string | null | undefined) {
    if (!value) return '';
    const v = String(value);
    const cls =
      v === 'urgent' ? 'badge-error' : v === 'high' ? 'badge-warning' : v === 'medium' ? 'badge-info' : 'badge-ghost';
    const label = this.toTitle(v);
    return `<span class="badge ${cls} badge-sm">${label}</span>`;
  }

  private toTitle(v: string) {
    return v
      .split('_')
      .map((s) => (s ? s[0].toUpperCase() + s.slice(1) : s))
      .join(' ');
  }

  private parseStatusLabel(label: string) {
    const idx = this.statusLabels.indexOf(label);
    return idx >= 0 ? this.statusOptions[idx] : label;
  }

  private parsePriorityLabel(label: string) {
    const idx = this.priorityLabels.indexOf(label);
    return idx >= 0 ? this.priorityOptions[idx] : label;
  }
}
