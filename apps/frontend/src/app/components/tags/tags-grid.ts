import { Component } from '@angular/core';
import { AddTagType } from '@common';
import { TagsService } from 'apps/frontend/src/app/components/tags/tags-service';
import { DataGrid } from '@uxcommon/datagrid';
import { AbstractAPIService } from '../../abstract.service';

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
