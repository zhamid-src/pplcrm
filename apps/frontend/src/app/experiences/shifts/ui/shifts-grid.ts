import { Component } from '@angular/core';
import { DataGrid } from '@frontend/shared/components/datagrid/datagrid';
import { provideDataGridConfig } from '@frontend/shared/components/datagrid/datagrid.tokens';

import { AbstractAPIService } from '../../../services/api/abstract-api.service';
import { ShiftsService } from '../services/shifts-service';

@Component({
  selector: 'pc-shifts-grid',
  imports: [DataGrid],
  template: `
    <div class="flex flex-col gap-6">
      <pc-datagrid
        title="Shifts"
        i18n-title
        description="Manage volunteer shifts, schedule events, and track attendance records."
        i18n-description
        [showDescription]="true"
        [colDefs]="col"
        [disableDelete]="false"
        [disableView]="false"
        [disableExport]="true"
        [disableImport]="true"
        [allowFilter]="false"
        [addRoute]="'add'"
        plusIcon="add-schedule"
        i18n-plusIcon
        [showArchiveIcon]="true"
        archiveIcon="archive-box-arrow-down"
        i18n-archiveIcon
        archiveTip="See archived events"
        i18n-archiveTip
      ></pc-datagrid>
    </div>
  `,
  providers: [
    { provide: AbstractAPIService, useExisting: ShiftsService },
    provideDataGridConfig({ messages: { exportEntity: 'volunteer', exportFileName: 'volunteer-export.csv' } }),
  ],
})
export class ShiftsGridComponent {
  private readonly dateFormatter = new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  protected col = [
    { field: 'name', headerName: 'Event Name', editable: true },
    { field: 'description', headerName: 'Description', editable: true },
    { field: 'location_address', headerName: 'Location', editable: true },
    {
      field: 'start_time',
      headerName: 'Start Time',
      valueFormatter: (p: any) => this.formatDate(p.value ?? p.data?.start_time),
      editable: false,
    },
    {
      field: 'end_time',
      headerName: 'End Time',
      valueFormatter: (p: any) => this.formatDate(p.value ?? p.data?.end_time),
      editable: false,
    },
    {
      field: 'volunteers_count',
      headerName: 'Signed Up',
      editable: false,
    },
    {
      field: 'capacity',
      headerName: 'Capacity',
      editable: true,
    },
  ];

  private formatDate(value: unknown): string {
    if (!value) return '';
    const date = value instanceof Date ? value : new Date(value as string);
    if (Number.isNaN(date.getTime())) return '';
    return this.dateFormatter.format(date);
  }
}
