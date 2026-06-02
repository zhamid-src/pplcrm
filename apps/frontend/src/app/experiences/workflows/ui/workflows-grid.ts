import { Component } from '@angular/core';
import { UpdateWorkflowType } from '@common';
import { DataGrid } from '@uxcommon/components/datagrid/datagrid';

import { AbstractAPIService } from '../../../services/api/abstract-api.service';
import { WorkflowsService } from '../services/workflows-service';

@Component({
  selector: 'pc-workflows-grid',
  imports: [DataGrid],
  template: `
    <div class="flex flex-col gap-6">
      <!-- Title Header -->
      <div class="flex justify-between items-center bg-base-100 p-6 rounded-2xl shadow-sm border border-base-200">
        <div>
          <h1 class="text-2xl font-bold tracking-tight">Automated Workflows</h1>
          <p class="text-sm text-base-content/60 mt-1">
            Create automated drip email campaigns triggered by volunteer events or manual enrollment.
          </p>
        </div>
      </div>

      <pc-datagrid
        [colDefs]="col"
        [disableDelete]="false"
        [disableView]="false"
        [disableImport]="true"
        [disableExport]="true"
        [addRoute]="'add'"
        plusIcon="plus"
      ></pc-datagrid>
    </div>
  `,
  providers: [{ provide: AbstractAPIService, useExisting: WorkflowsService }],
})
export class WorkflowsGridComponent extends DataGrid<'workflows', UpdateWorkflowType> {
  private readonly dateFormatter = new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  protected col = [
    { field: 'name', headerName: 'Workflow Name' },
    {
      field: 'trigger_type',
      headerName: 'Trigger Type',
      valueFormatter: (p: any) => this.formatTriggerType(p.value ?? p.data?.trigger_type),
    },
    {
      field: 'status',
      headerName: 'Status',
      valueFormatter: (p: any) => this.formatStatus(p.value ?? p.data?.status),
    },
    {
      field: 'steps_count',
      headerName: 'Steps Count',
      valueFormatter: (p: any) => String(p.value ?? p.data?.steps_count ?? 0),
    },
    {
      field: 'active_enrollments_count',
      headerName: 'Active Enrollments',
      valueFormatter: (p: any) => String(p.value ?? p.data?.active_enrollments_count ?? 0),
    },
    {
      field: 'updated_at',
      headerName: 'Last Updated',
      valueFormatter: (p: any) => this.formatDate(p.value ?? p.data?.updated_at),
    },
  ];

  constructor() {
    super();
  }

  private formatDate(value: unknown): string {
    if (!value) return '--';
    const date = value instanceof Date ? value : new Date(value as string);
    if (Number.isNaN(date.getTime())) return '--';
    return this.dateFormatter.format(date);
  }

  private formatTriggerType(value: unknown): string {
    if (!value) return '--';
    const text = String(value).trim();
    if (text === 'volunteer_signup') return 'Volunteer Signup';
    if (text === 'manual') return 'Manual Enrollment';
    return text.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }

  private formatStatus(value: unknown): string {
    if (!value) return '--';
    const text = String(value).trim();
    if (text === 'active') return 'Active';
    if (text === 'draft') return 'Draft';
    if (text === 'paused') return 'Paused';
    return text.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }
}
