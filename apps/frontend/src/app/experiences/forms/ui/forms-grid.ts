import { Component } from '@angular/core';
import { FormsService } from '@experiences/forms/services/forms-service';
import { DataGrid } from '@frontend/shared/components/datagrid/datagrid';
import { AbstractAPIService } from '../../../services/api/abstract-api.service';
import { provideDataGridConfig } from '@frontend/shared/components/datagrid/datagrid.tokens';

@Component({
  selector: 'pc-forms-grid',
  imports: [DataGrid],
  template: `
    <div class="flex flex-col gap-6">
      <pc-datagrid
        title="Forms"
        description="Manage public and internal web forms, configure fields, and view submission statistics."
        [colDefs]="col"
        [disableDelete]="false"
        [allowFilter]="false"
        [disableView]="false"
        addRoute="add"
        plusIcon="add-form"
      ></pc-datagrid>
    </div>
  `,
  providers: [
    { provide: AbstractAPIService, useExisting: FormsService },
    provideDataGridConfig({ messages: { exportEntity: 'forms', exportFileName: 'forms-export.csv' } }),
  ],
})
export class FormsGridComponent {
  protected col = [
    { field: 'name', headerName: 'Form Name', editable: false },
    { field: 'description', headerName: 'Description', editable: false },
    { field: 'redirect_url', headerName: 'Redirect URL', editable: false },
    { field: 'status', headerName: 'Status', editable: true },
    {
      field: 'created_at',
      headerName: 'Created At',
      valueFormatter: (p: any) => (p.value ? new Date(p.value).toLocaleDateString() : ''),
    },
  ];

  constructor() {}
}
