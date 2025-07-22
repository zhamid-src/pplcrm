import { Component } from '@angular/core';
import { UpdateHouseholdsObj } from '@common';
import { DataGrid } from '@uxcommon/datagrid';
import { TagsCellRenderer } from '../tags/tags-cell-renderer';
import { HouseholdsService } from './households-service';
import { AbstractAPIService } from '../../abstract.service';

interface ParamsType {
  value: string[];
}

@Component({
  selector: 'pc-households-grid',
  imports: [DataGrid],
  template: ` <pc-datagrid [colDefs]="col" [disableDelete]="true" [disableView]="false" addRoute="add"></pc-datagrid> `,
  providers: [{ provide: AbstractAPIService, useClass: HouseholdsService }],
})

/**
 * This is the households grid component used to display the list of households.
 * It also gets the number of people that belong to each household.
 *
 * @see {@link DatagridComponent}
 */
export class HouseholdsGrid extends DataGrid<'households', never> {
  protected col = [
    {
      field: 'persons_count',
      headerName: 'People',
      onCellDoubleClicked: this.openEditOnDoubleClick.bind(this),
    },
    { field: 'street_num', headerName: 'Street Number', editable: true },
    { field: 'apt', headerName: 'Apt', editable: true },
    { field: 'street', headerName: 'Street', editable: true },
    { field: 'city', headerName: 'City', editable: true },
    {
      field: 'tags',
      filter: true,
      headerName: 'Tags',
      cellDataType: 'object',
      cellRendererParams: {
        type: 'households',
        obj: UpdateHouseholdsObj,
        service: this.gridSvc,
      },
      cellRenderer: TagsCellRenderer,
      onCellDoubleClicked: this.openEditOnDoubleClick.bind(this),
      equals: (tagsA: string[], tagsB: string[]) => this.tagArrayEquals(tagsA, tagsB) === 0,
      valueFormatter: (params: ParamsType) => this.tagsToString(params.value),
      comparator: (tagsA: string[], tagsB: string[]) => this.tagArrayEquals(tagsA, tagsB),
    },
    { field: 'state', headerName: 'State/Province', editable: true },
    { field: 'zip', headerName: 'Zip/Province', editable: true },
    { field: 'country', headerName: 'Country', editable: true },
    { field: 'home_phone', headerName: 'Home phone', editable: true },
    { field: 'notes', headerName: 'Notes', editable: true },
  ];

  constructor() {
    super();
  }
}
