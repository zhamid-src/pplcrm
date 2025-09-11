/**
 * @file Grid component for listing households with counts and tags.
 */
import { Component, inject } from '@angular/core';
import { UpdateHouseholdsObj } from '@common';
import { DataGrid } from '@uxcommon/components/datagrid/datagrid';
import { DataGridUtilsService } from '@uxcommon/components/datagrid/services/utils.service';

import { AbstractAPIService } from '../../../services/api/abstract-api.service';
import { HouseholdsService } from '../services/households-service';

interface ParamsType {
  value: string[];
}

@Component({
  selector: 'pc-households-grid',
  imports: [DataGrid],
  template: `
    <pc-datagrid [colDefs]="col" [disableDelete]="true" [disableView]="false" addRoute="add" plusIcon="add-home">
    </pc-datagrid>
  `,
  providers: [{ provide: AbstractAPIService, useClass: HouseholdsService }],
})

/**
 * This is the households grid component used to display the list of households.
 * It also gets the number of people that belong to each household.
 *
 * Extends the base {@link DataGrid} to provide custom columns and renderers.
 *
 * @see {@link DataGrid}
 */
export class HouseholdsGrid extends DataGrid<'households', never> {
  private readonly utils = inject(DataGridUtilsService);
  /** Column definitions for the households datagrid. */
  protected col = [
    {
      field: 'persons_count',
      headerName: 'People',
      onCellDoubleClicked: this.openEditOnDoubleClick.bind(this),
    },
    { field: 'street_num', headerName: 'Street Number', editable: true },
    { field: 'apt', headerName: 'Apt', editable: true },
    { field: 'street1', headerName: 'Street 1', editable: true },
    { field: 'street2', headerName: 'Street 2', editable: true },
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
      // cellRenderer removed; valueFormatter renders tags
      onCellDoubleClicked: this.openEditOnDoubleClick.bind(this),
      /**
       * Compares two tag arrays for equality.
       * @param tagsA First array of tags
       * @param tagsB Second array of tags
       * @returns Whether they are considered equal
       */
      equals: (tagsA: string[], tagsB: string[]) => this.utils.tagArrayEquals(tagsA, tagsB) === 0,
      /**
       * Formats the tag array for display as a string.
       * @param params The cell parameters containing the tag array
       * @returns Comma-separated string of tags
       */
      valueFormatter: (params: ParamsType) => this.utils.tagsToString(params.value),
      /**
       * Comparator function for sorting tag arrays
       * @param tagsA First array of tags
       * @param tagsB Second array of tags
       * @returns Sort order: -1, 0, or 1
       */
      comparator: (tagsA: string[], tagsB: string[]) => this.utils.tagArrayEquals(tagsA, tagsB),
    },
    { field: 'state', headerName: 'State/Province', editable: true },
    { field: 'zip', headerName: 'Zip/Province', editable: true },
    { field: 'country', headerName: 'Country', editable: true },
    { field: 'home_phone', headerName: 'Home phone', editable: true },
    { field: 'notes', headerName: 'Notes', editable: true },
  ];

  /**
   * Constructor: Calls the parent constructor of DataGrid
   */
  constructor() {
    super();
  }
}
