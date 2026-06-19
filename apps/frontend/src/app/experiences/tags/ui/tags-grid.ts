/**
 * @file Data grid component for viewing and editing tags.
 */
import { Component } from '@angular/core';
import { AddTagType } from '../../../../../../../libs/common/src';
import { TagsService } from '@experiences/tags/services/tags-service';
import { DataGrid } from '@frontend/shared/components/datagrid/datagrid';
import { AbstractAPIService } from '../../../services/api/abstract-api.service';
import { provideDataGridConfig } from '@frontend/shared/components/datagrid/datagrid.tokens';

@Component({
  selector: 'pc-tags-grid',
  imports: [DataGrid],
  template: `
    <div class="flex flex-col gap-6">
      <pc-datagrid
        title="Tags"
        description="Manage custom categorization tags used across people, households."
        [colDefs]="col"
        [disableDelete]="false"
        [allowFilter]="false"
        addRoute="add"
        plusIcon="add-label"
      ></pc-datagrid>
    </div>
  `,
  providers: [
    { provide: AbstractAPIService, useExisting: TagsService },
    provideDataGridConfig({ messages: { exportEntity: 'tags', exportFileName: 'tags-export.csv' } }),
  ],
})
export class TagsGridComponent extends DataGrid<'tags', AddTagType> {
  protected col = [
    { field: 'name', headerName: 'Tag Name', editable: true },
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

  constructor() {
    super();
  }

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
