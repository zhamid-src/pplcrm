import { Component } from '@angular/core';
import { AddTagType } from '@common';
import { TagsService } from 'apps/frontend/src/app/components/tags/tags-service';
import { DataGrid } from '@uxcommon/datagrid';
import { AbstractAPIService } from '../../abstract.service';

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
  template: `<pc-datagrid [colDefs]="col" [disableDelete]="false" addRoute="add"></pc-datagrid>`,
  providers: [{ provide: AbstractAPIService, useClass: TagsService }],
})
export class TagsGridComponent extends DataGrid<'tags', AddTagType> {
  protected col = [
    { field: 'name', headerName: 'Tag Name', editable: true },
    { field: 'description', headerName: 'Description', editable: true },
    { field: 'use_count_people', headerName: 'People' },
    { field: 'use_count_households', headerName: 'Households' },
  ];

  constructor() {
    super();
  }
}
