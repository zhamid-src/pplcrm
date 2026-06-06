import { Component } from '@angular/core';
import { AddWebFormType } from '@common';
import { FormsService } from '@experiences/forms/services/forms-service';
import { DataGrid } from '@uxcommon/components/datagrid/datagrid';
import { AbstractAPIService } from '../../../services/api/abstract-api.service';

@Component({
  selector: 'pc-forms-grid',
  imports: [DataGrid],
  template: `
    <div class="flex flex-col gap-6">
      <!-- Title Header -->
      <div class="flex justify-between items-center bg-base-100 p-6 rounded-2xl shadow-sm border border-base-200">
        <div>
          <h1 class="text-2xl font-bold tracking-tight">Forms</h1>
          <p class="text-sm text-base-content/60 mt-1">
            Manage public and internal web forms, configure fields, and view submission statistics.
          </p>
        </div>
      </div>

      <pc-datagrid
        [colDefs]="col"
        [disableDelete]="false"
        [disableView]="false"
        addRoute="add"
        plusIcon="add-form"
      ></pc-datagrid>
    </div>
  `,
  providers: [{ provide: AbstractAPIService, useExisting: FormsService }],
})
export class FormsGridComponent extends DataGrid<'web_forms', AddWebFormType> {
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

  constructor() {
    super();
  }
}
