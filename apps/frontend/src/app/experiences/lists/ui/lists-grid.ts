/**
 * Grid component for viewing and editing lists of people or households.
 */
import { Component } from '@angular/core';
import { UpdateListType } from '@common';
import { ListsService } from '@experiences/lists/services/lists-service';
import { DataGrid } from '@uxcommon/components/datagrid/datagrid';

import { AbstractAPIService } from '../../../services/api/abstract-api.service';

@Component({
  selector: 'pc-lists-grid',
  imports: [DataGrid],
  template: `<pc-datagrid
    [colDefs]="col"
    [disableDelete]="false"
    [disableView]="false"
    plusIcon="add-list"
    addRoute="add"
  ></pc-datagrid>`,
  providers: [{ provide: AbstractAPIService, useClass: ListsService }],
})
export class ListsGridComponent extends DataGrid<'lists', UpdateListType> {
  protected col = [
    { field: 'name', headerName: 'List Name', editable: true },
    { field: 'description', headerName: 'Description', editable: true },
    { field: 'object', headerName: 'Type' },
    { field: 'list_size', headerName: 'List Size' },
    { field: 'used_in', headerName: 'Used In' },
    { field: 'updated_at', headerName: 'Last Updated' },
    { field: 'created_by', headerName: 'Created By' },
  ];

  constructor() {
    super();
  }
}
