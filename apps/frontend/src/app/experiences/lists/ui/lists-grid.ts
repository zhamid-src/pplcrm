/**
 * Grid component for viewing and editing lists of people or households.
 */
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { UpdateListType } from '@common';
import { ListsRefreshService } from '@experiences/lists/services/lists-refresh.service';
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
export class ListsGridComponent extends DataGrid<'lists', UpdateListType> implements OnInit, OnDestroy {
  private readonly refreshSvc = inject(ListsRefreshService);

  private sub?: { unsubscribe(): void };

  protected col = [
    { field: 'id', headerName: 'ID' },
    { field: 'name', headerName: 'List Name', editable: true },
    { field: 'description', headerName: 'Description', editable: true },
    { field: 'object', headerName: 'Type', cellEditorParams: { values: ['people', 'households'] } },
    {
      field: 'list_size',
      headerName: 'List Size',
      valueFormatter: (p: any) => {
        const dyn = p?.data?.is_dynamic;
        const isDynamic = dyn === true || dyn === 'true' || dyn === 1;
        return isDynamic ? 'N/A' : p?.value ?? 0;
      },
    },
    { field: 'used_in', headerName: 'Used In' },
    { field: 'updated_at', headerName: 'Last Updated' },
    { field: 'created_by', headerName: 'Created By' },
  ];

  constructor() {
    super();
  }

  public ngOnDestroy() {
    this.sub?.unsubscribe?.();
  }

  public override async ngOnInit() {
    await super.ngOnInit();
    this.sub = this.refreshSvc.changes$.subscribe(() => this.refresh());
  }
}
