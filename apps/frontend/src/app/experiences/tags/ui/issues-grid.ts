import { Component, inject } from '@angular/core';
import { TagsService } from '@experiences/tags/services/tags-service';
import { DataGrid } from '@frontend/shared/components/datagrid/datagrid';
import type { getAllOptionsType } from '../../../../../../../libs/common/src';
import { AbstractAPIService } from '../../../services/api/abstract-api.service';
import { provideDataGridConfig } from '@frontend/shared/components/datagrid/datagrid.tokens';

class IssuesService extends TagsService {
  private readonly globalTagsSvc = inject(TagsService, { skipSelf: true, optional: true });

  public override getAll(options?: getAllOptionsType) {
    return this.getAllWithCounts({ ...(options ?? {}), type: 'issue' } as getAllOptionsType);
  }

  public override triggerRefresh() {
    super.triggerRefresh();
    this.globalTagsSvc?.triggerRefresh();
  }
}

@Component({
  selector: 'pc-issues-grid',
  imports: [DataGrid],
  template: `
    <div class="flex flex-col gap-6">
      <pc-datagrid
        title="Issues"
        description="Manage political or support issues to track contact stances and interests."
        [colDefs]="col"
        [disableDelete]="false"
        [allowFilter]="false"
        addRoute="add"
        plusIcon="add-issue"
      ></pc-datagrid>
    </div>
  `,
  providers: [
    IssuesService,
    { provide: AbstractAPIService, useExisting: IssuesService },
    provideDataGridConfig({ messages: { exportEntity: 'issues', exportFileName: 'issues-export.csv' } }),
  ],
})
export class IssuesGridComponent {
  protected col = [
    { field: 'name', headerName: 'Issue Name', editable: true },
    { field: 'description', headerName: 'Description', editable: true },
    {
      field: 'color',
      headerName: 'Colour',
      editable: true,
      cellDataType: 'color',
      cellRenderer: (p: any) => this.renderColorCell(p.value ?? p.data?.color ?? null),
    },
    { field: 'deletable', headerName: 'Deletable', type: 'boolean', editable: false },
    { field: 'use_count_people', headerName: 'People' },
    { field: 'use_count_households', headerName: 'Households' },
  ];

  constructor() {}

  protected renderColorCell(raw: unknown): string {
    const v = typeof raw === 'string' ? raw.trim() : '';
    if (!/^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(v)) {
      return '<span class="text-xs text-neutral">None</span>';
    }
    const color = v.toLowerCase();
    return `
    <span class="inline-block h-4 w-8 rounded border shadow-sm"
          style="background-color:${color}; border-color:${color}"
          title="${color}"></span>
  `;
  }
}
