import { Component } from '@angular/core';
import { DataGrid } from '@frontend/shared/components/datagrid/datagrid';
import { AbstractAPIService } from '../../../services/api/abstract-api.service';
import { provideDataGridConfig } from '@frontend/shared/components/datagrid/datagrid.tokens';
import { EventsFrontendService } from '../services/events-frontend-service';

@Component({
  selector: 'pc-event-pages-grid',
  imports: [DataGrid],
  template: `
    <div class="flex flex-col gap-6">
      <pc-datagrid
        title="Event Pages"
        description="Manage public event pages with RSVP and ticketing for fundraisers, town halls, and meet-and-greets."
        [colDefs]="col"
        [disableDelete]="false"
        [disableView]="false"
        [disableExport]="true"
        [disableImport]="true"
        [allowFilter]="false"
        [addRoute]="'add'"
        plusIcon="calendar"
        [showArchiveIcon]="true"
        archiveIcon="archive-box-arrow-down"
        archiveTip="See past events"
      ></pc-datagrid>
    </div>
  `,
  providers: [
    { provide: AbstractAPIService, useExisting: EventsFrontendService },
    provideDataGridConfig({ messages: { exportFileName: 'events-export.csv' } }),
  ],
})
export class EventPagesGridComponent {
  private readonly dateFormatter = new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  protected col = [
    { field: 'name', headerName: 'Event Name', editable: true },
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
      field: 'is_published',
      headerName: 'Published',
      valueFormatter: (p: any) => (p.value ? 'Yes' : 'Draft'),
      editable: false,
    },
    {
      field: 'registrations_count',
      headerName: 'Registrations',
      editable: false,
    },
    {
      field: 'capacity',
      headerName: 'Capacity',
      editable: false,
      valueFormatter: (p: any) => p.value ?? 'Unlimited',
    },
  ];

  private formatDate(value: unknown): string {
    if (!value) return '';
    const date = value instanceof Date ? value : new Date(value as string);
    if (Number.isNaN(date.getTime())) return '';
    return this.dateFormatter.format(date);
  }
}
