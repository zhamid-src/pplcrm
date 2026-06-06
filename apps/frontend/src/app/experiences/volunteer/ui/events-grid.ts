import { Component } from '@angular/core';
import { UpdateVolunteerEventType } from '@common';
import { DataGrid } from '@uxcommon/components/datagrid/datagrid';

import { AbstractAPIService } from '../../../services/api/abstract-api.service';
import { VolunteerEventsFrontendService } from '../services/volunteer-events-frontend-service';

@Component({
  selector: 'pc-events-grid',
  imports: [DataGrid],
  template: `
    <div class="flex flex-col gap-6">
      <!-- Title Header -->
      <div class="flex justify-between items-center bg-base-100 p-6 rounded-2xl shadow-sm border border-base-200">
        <div>
          <h1 class="text-2xl font-bold tracking-tight">Schedule</h1>
          <p class="text-sm text-base-content/60 mt-1">
            Manage volunteer shifts, schedule events, and track attendance records.
          </p>
        </div>
      </div>

      <pc-datagrid
        [colDefs]="col"
        [disableDelete]="false"
        [disableView]="false"
        [disableExport]="true"
        [disableImport]="true"
        [addRoute]="'add'"
        plusIcon="add-schedule"
        [showArchiveIcon]="true"
        archiveIcon="archive-box-arrow-down"
        archiveTip="See archived events"
      ></pc-datagrid>
    </div>
  `,
  providers: [{ provide: AbstractAPIService, useExisting: VolunteerEventsFrontendService }],
})
export class EventsGridComponent extends DataGrid<'volunteer_events', UpdateVolunteerEventType> {
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
