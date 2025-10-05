/**
 * @file Data grid component for viewing and editing tags.
 */
import { Component } from '@angular/core';
import { AddTagType } from '@common';
import { TagsService } from '@experiences/tags/services/tags-service';
import { DataGrid } from '@uxcommon/components/datagrid/datagrid';

import { AbstractAPIService } from '../../../services/api/abstract-api.service';

/**
 * `TagsGridComponent` displays a data grid of tags with editable fields.
 *
 * ## Description
 * Extends the reusable `DataGrid` component to show a list of tags and their usage counts
 * in people and households. Allows inline editing of the tag name and description.
 *
 * ## Template
 * Renders a `<pc-datagrid>` component with column definitions.
 * The `addRoute` is set to `"add"` to link to the tag creation view.
 *
 * ## Providers
 * - Binds `TagsService` to `AbstractAPIService` to handle backend communication for tags.
 *
 * ## Columns
 * - `name`: Tag name (editable)
 * - `description`: Tag description (editable)
 * - `use_count_people`: Number of people using this tag (read-only)
 * - `use_count_households`: Number of households using this tag (read-only)
 */
@Component({
  selector: 'pc-tags-grid',
  imports: [DataGrid],
  template: `<pc-datagrid [colDefs]="col" [disableDelete]="false" addRoute="add" plusIcon="add-label"></pc-datagrid>`,
  providers: [{ provide: AbstractAPIService, useClass: TagsService }],
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
