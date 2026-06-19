import { Component } from '@angular/core';
import { DataGrid } from '@frontend/shared/components/datagrid/datagrid';
import { AbstractAPIService } from '../../../services/api/abstract-api.service';
import { provideDataGridConfig } from '@frontend/shared/components/datagrid/datagrid.tokens';
import { TeamsService } from '../services/teams-service';

@Component({
  selector: 'pc-teams-grid',
  imports: [DataGrid],
  template: `
    <div class="flex flex-col gap-6">
      <pc-datagrid
        title="Teams"
        description="Organize volunteers and staff into structured teams, assign captains, and coordinate group activities."
        [colDefs]="col"
        [disableDelete]="false"
        [disableView]="false"
        [disableExport]="true"
        [disableImport]="true"
        [allowFilter]="false"
        [addRoute]="'add'"
        plusIcon="add-group"
      ></pc-datagrid>
    </div>
  `,
  providers: [
    { provide: AbstractAPIService, useExisting: TeamsService },
    provideDataGridConfig({ messages: { exportEntity: 'teams', exportFileName: 'teams-export.csv' } }),
  ],
})
export class TeamsGridComponent {
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
