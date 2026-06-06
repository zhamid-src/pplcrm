import { Component } from '@angular/core';
import { UpdateTeamType } from '@common';
import { DataGrid } from '@uxcommon/components/datagrid/datagrid';

import { AbstractAPIService } from '../../../services/api/abstract-api.service';
import { TeamsService } from '../services/teams-service';

@Component({
  selector: 'pc-teams-grid',
  imports: [DataGrid],
  template: `
    <div class="flex flex-col gap-6">
      <!-- Title Header -->
      <div class="flex justify-between items-center bg-base-100 p-6 rounded-2xl shadow-sm border border-base-200">
        <div>
          <h1 class="text-2xl font-bold tracking-tight">Teams</h1>
          <p class="text-sm text-base-content/60 mt-1">
            Organize volunteers and staff into structured teams, assign captains, and coordinate group activities.
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
        plusIcon="add-group"
      ></pc-datagrid>
    </div>
  `,
  providers: [{ provide: AbstractAPIService, useExisting: TeamsService }],
})
export class TeamsGridComponent extends DataGrid<'teams', UpdateTeamType> {
  private readonly dateFormatter = new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  protected col = [
    { field: 'name', headerName: 'Team', editable: true },
    { field: 'description', headerName: 'Description', editable: true },
    {
      field: 'team_captain_name',
      headerName: 'Team Captain',
      valueGetter: (p: any) => p.data?.team_captain_name ?? '',
      editable: false,
    },
    {
      field: 'volunteer_count',
      headerName: 'Volunteers',
      editable: false,
    },
    {
      field: 'updated_at',
      headerName: 'Updated',
      valueFormatter: (p: any) => this.formatDate(p.value ?? p.data?.updated_at),
    },
  ];

  private formatDate(value: unknown): string {
    if (!value) return '';
    const date = value instanceof Date ? value : new Date(value as string);
    if (Number.isNaN(date.getTime())) return '';
    return this.dateFormatter.format(date);
  }
}
