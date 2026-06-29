import { Component } from '@angular/core';
import { DonationPagesService } from '@experiences/forms/services/donation-pages-service';
import { DataGrid } from '@frontend/shared/components/datagrid/datagrid';
import { provideDataGridConfig } from '@frontend/shared/components/datagrid/datagrid.tokens';

import { AbstractAPIService } from '../../../services/api/abstract-api.service';

@Component({
  selector: 'pc-fundraising-grid',
  imports: [DataGrid],
  template: `
    <div class="flex flex-col gap-6">
      <pc-datagrid
        title="Donation Pages"
        i18n-title
        description="Manage embeddable donation and recurring pledge pages that connect to Stripe."
        i18n-description
        [showDescription]="true"
        [colDefs]="col"
        [disableDelete]="false"
        [allowFilter]="false"
        [disableView]="false"
        addRoute="add"
        i18n-addRoute
        plusIcon="plus"
        i18n-plusIcon
      ></pc-datagrid>
    </div>
  `,
  providers: [
    { provide: AbstractAPIService, useExisting: DonationPagesService },
    provideDataGridConfig({ messages: { exportEntity: 'forms', exportFileName: 'donation-pages-export.csv' } }),
  ],
})
export class FundraisingGridComponent {
  protected col = [
    { field: 'name', headerName: 'Page Name', editable: false },
    { field: 'description', headerName: 'Description', editable: false },
    {
      field: 'form_type',
      headerName: 'Type',
      editable: false,
      valueFormatter: (p: any) => (p.value === 'recurring_donation' ? 'Recurring' : 'One-Time'),
    },
    { field: 'status', headerName: 'Status', editable: true },
    {
      field: 'created_at',
      headerName: 'Created At',
      valueFormatter: (p: any) => (p.value ? new Date(p.value).toLocaleDateString() : ''),
    },
  ];
}
