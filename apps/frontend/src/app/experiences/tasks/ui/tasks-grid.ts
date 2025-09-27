import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { UpdateTaskType } from '@common';
import { TasksService } from '@experiences/tasks/services/tasks-service';
import { CsvImportComponent, type CsvImportSummary } from '@uxcommon/components/csv-import/csv-import';
import { DataGrid } from '@uxcommon/components/datagrid/datagrid';

import { AuthService } from '../../../auth/auth-service';
import { AbstractAPIService } from '../../../services/api/abstract-api.service';

@Component({
  selector: 'pc-tasks-grid',
  imports: [DataGrid, CsvImportComponent, FormsModule],
  template: `
    <pc-datagrid
      [colDefs]="col"
      [disableDelete]="false"
      [disableView]="false"
      [disableImport]="false"
      [showArchiveIcon]="true"
      (importCSV)="openImportDialog()"
    ></pc-datagrid>

    <pc-csv-importer
      [open]="importerOpen()"
      [title]="'Import Tasks from CSV'"
      [mappableFields]="mappableFields"
      [autoMapHeader]="autoMapHeader"
      [summary]="importSummary()"
      (submit)="onImportSubmit($event)"
      (close)="importerOpen.set(false); importSummary.set(null)"
      (closeSummary)="importSummary.set(null)"
    />
  `,
  providers: [{ provide: AbstractAPIService, useClass: TasksService }],
})
export class TasksGrid extends DataGrid<'tasks', UpdateTaskType> implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly priorityLabels = ['Low', 'Medium', 'High', 'Urgent'];
  private readonly priorityOptions = ['low', 'medium', 'high', 'urgent'];
  private readonly statusLabels = ['Todo', 'In Progress', 'Blocked', 'Done', 'Canceled'];
  private readonly statusOptions = ['todo', 'in_progress', 'blocked', 'done', 'canceled'];

  //private readonly tasksSvc = inject(TasksService);
  private readonly unassignedLabel = 'Not Assigned';

  // Users for Assigned To (populated via AuthService on init)
  private userIds: string[] = [];
  private userLabels: string[] = [];
  private usersById = new Map<string, string>();

  // Fields we will accept from CSV for future import support
  protected readonly mappableFields: string[] = ['name', 'status', 'priority', 'due_at', 'assigned_to'];

  protected col = [
    { field: 'id', headerName: 'ID' },
    {
      field: 'assigned_to',
      headerName: 'Assigned To',
      editable: true,
      valueGetter: (p: any) => this.assignedToValueGetter(p),
      valueFormatter: (p: any) => this.assignedToValueFormatter(p),
      cellRenderer: (p: any) => this.renderAssignedCell(p.value),
      cellEditorParams: () => ({ values: [this.unassignedLabel, ...this.userLabels] }),
      valueSetter: (p: any) => this.assignToValueSetter(p),
    },
    { field: 'name', headerName: 'Task', editable: true },
    {
      field: 'status',
      headerName: 'Status',
      editable: true,
      cellRenderer: (p: any) => this.renderStatusBadge(p.value),
      cellEditorParams: { values: this.statusOptions, labels: this.statusLabels },
      valueSetter: (p: any) => this.statusValueSetter(p),
    },
    {
      field: 'priority',
      headerName: 'Priority',
      editable: true,
      cellRenderer: (p: any) => this.renderPriorityBadge(p.value),
      cellEditorParams: { values: this.priorityOptions, labels: this.priorityLabels },
      valueSetter: (p: any) => this.priorityValueSetter(p),
    },
    {
      field: 'due_at',
      headerName: 'Due',
      editable: true,
      valueGetter: (p: any) => this.toDateOnly(p.data?.due_at ?? p.value),
      valueSetter: (p: any) => this.dueAtValueSetter(p),
      valueFormatter: (p: any) => this.formatDate(p.value),
      cellClass: (p: any) => (this.isOverdue(p.data) ? 'text-error font-semibold' : undefined),
    },
    {
      field: 'createdby_id',
      headerName: 'Created By',
      editable: false,
      valueFormatter: (p: any) => this.userNameForId(p.value),
      // Provide filter options using known user labels
      cellEditorParams: () => ({ values: this.userLabels }),
    },
  ];
  protected importSummary = signal<CsvImportSummary | null>(null);
  protected importerOpen = signal(false);
  protected isArchiveMode = signal(false);

  constructor() {
    super();
  }

  public override async ngOnInit() {
    // Load users to drive Assigned To options and name mapping
    try {
      const users = await this.auth.getUsers();
      this.usersById = new Map(users.map((u) => [String(u.id), `${u.first_name}`]));
      this.userIds = users.map((u) => String(u.id));
      this.userLabels = users.map((u) => `${u.first_name}`);
    } catch {
      /* no op */
    }
    await super.ngOnInit();
  }

  protected readonly autoMapHeader = (h: string): string => {
    const raw = (h || '').toLowerCase().trim();
    const key = raw.replace(/[^a-z0-9]/g, '');
    const map: Record<string, string> = {
      task: 'name',
      title: 'name',
      subject: 'name',
      status: 'status',
      priority: 'priority',
      due: 'due_at',
      duedate: 'due_at',
      dueat: 'due_at',
      assignedto: 'assigned_to',
      assignee: 'assigned_to',
      owner: 'assigned_to',
    };
    return map[key] || '';
  };

  protected onImportSubmit(payload: { rows: Array<Record<string, string>>; skipped: number }) {
    // No backend support yet; report helpful message
    const msg = 'Tasks import is not available yet.';
    this.importSummary.set({ inserted: 0, errors: 0, skipped: payload.skipped, failed: true, message: msg });
    this.importerOpen.set(false);
  }

  protected openImportDialog() {
    this.importSummary.set(null);
    this.importerOpen.set(true);
  }

  private assignToValueSetter(p: any) {
    {
      const label: string = p.newValue ?? '';
      if (label === this.unassignedLabel) {
        if ((p.data as Record<string, any>)['assigned_to'] !== null) {
          (p.data as Record<string, any>)['assigned_to'] = null;
          return true;
        }
        return false;
      }
      const idx = this.userLabels.indexOf(label);
      const id = idx >= 0 ? this.userIds[idx] : String(p.newValue ?? '');
      if ((p.data as Record<string, any>)['assigned_to'] !== id) {
        (p.data as Record<string, any>)['assigned_to'] = id;
        return true;
      }
      return false;
    }
  }

  private assignedToValueFormatter(p: any) {
    const v = p.value;
    if (v === null || v === undefined || v === '') return this.unassignedLabel;
    return this.usersById.get(String(v)) ?? String(v ?? '');
  }

  private assignedToValueGetter(p: any) {
    const id = p.data?.assigned_to ?? p.value;
    if (id === null || id === undefined || id === '') return this.unassignedLabel;
    return this.usersById.get(String(id)) ?? String(id);
  }

  private dueAtValueSetter(p: any) {
    const val: string = p.newValue || p.value || '';
    // ensure only YYYY-MM-DD is stored
    const dateOnly = val.length > 10 ? val.slice(0, 10) : val;
    if ((p.data as Record<string, any>)['due_at'] !== dateOnly) {
      (p.data as Record<string, any>)['due_at'] = dateOnly;
      return true;
    }
    return false;
  }

  private formatDate(value: any) {
    if (!value) return '';
    const d = new Date(this.toDateOnly(value));
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString();
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

  private normalizeChoice(value: string) {
    return value.replace(/[_\s-]+/g, '').toLowerCase();
  }

  private parsePriorityLabel(label: string) {
    const norm = this.normalizeChoice(label);
    const idx = this.priorityLabels.findIndex((l) => this.normalizeChoice(l) === norm);
    if (idx >= 0) return this.priorityOptions[idx];
    const optionIdx = this.priorityOptions.findIndex((opt) => this.normalizeChoice(opt) === norm);
    return optionIdx >= 0 ? this.priorityOptions[optionIdx] : label;
  }

  private parseStatusLabel(label: string) {
    const norm = this.normalizeChoice(label);
    const idx = this.statusLabels.findIndex((l) => this.normalizeChoice(l) === norm);
    if (idx >= 0) return this.statusOptions[idx];
    const optionIdx = this.statusOptions.findIndex((opt) => this.normalizeChoice(opt) === norm);
    return optionIdx >= 0 ? this.statusOptions[optionIdx] : label;
  }

  private priorityValueSetter(p: any) {
    const v = this.parsePriorityLabel(p.newValue);
    if ((p.data as Record<string, any>)['priority'] !== v) {
      (p.data as Record<string, any>)['priority'] = v;
      return true;
    }
    return false;
  }

  private renderAssignedCell(value: string | null | undefined) {
    const v = value == null ? '' : String(value);
    const isUnassigned = !v || v === this.unassignedLabel;
    const label = isUnassigned ? this.unassignedLabel : v;
    if (isUnassigned) {
      return `<span class="badge badge-error badge-sm">${label}</span>`;
    }
    return label;
  }

  private renderPriorityBadge(value: string | null | undefined) {
    if (!value) return '';
    const v = String(value);
    const cls =
      v === 'urgent' ? 'badge-error' : v === 'high' ? 'badge-warning' : v === 'medium' ? 'badge-info' : 'badge-ghost';
    const label = this.toTitle(v);
    return `<span class="badge ${cls} badge-sm">${label}</span>`;
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

  private statusValueSetter(p: any) {
    const v = this.parseStatusLabel(p.newValue);
    if ((p.data as Record<string, any>)['status'] !== v) {
      (p.data as Record<string, any>)['status'] = v;
      return true;
    }
    return false;
  }

  private toDateOnly(v: any): string {
    if (!v) return '';
    const str = typeof v === 'string' ? v : new Date(v).toISOString();
    return str.length > 10 ? str.slice(0, 10) : str;
  }

  private toTitle(v: string) {
    return v
      .replace(/[_-]+/g, ' ')
      .split(' ')
      .map((s) => (s ? s[0].toUpperCase() + s.slice(1) : s))
      .join(' ');
  }

  private userNameForId(id: string | number | null | undefined) {
    if (id === null || id === undefined || id === '') return '';
    const key = String(id);
    return this.usersById.get(key) ?? '';
  }
}
