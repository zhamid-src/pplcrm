import { CellDoubleClickedEvent, ColDef } from '@ag-grid-community/core';
import { Component } from '@angular/core';
import { UpdatePersonsObj, UpdatePersonsType } from '@common';
import { DataGrid } from '@uxcommon/datagrid/datagrid';
import { Icon } from '@uxcommon/icon';

import { AbstractAPIService } from '../../abstract.service';
import { TagsCellRenderer } from '../tags/tags-cell-renderer';
import { DATA_TYPE, PersonsService } from './persons-service';

interface ParamsType {
  value: string[];
}

/**
 * PersonsGrid component displays a grid of people with editable fields and tags.
 * It extends the common DataGrid and integrates address confirmation and tag functionality.
 *
 * @see {@link DataGrid}
 * @see {@link TagsCellRenderer}
 */
@Component({
  selector: 'pc-persons-grid',
  imports: [DataGrid, Icon],
  templateUrl: './persons-grid.html',
  providers: [{ provide: AbstractAPIService, useClass: PersonsService }],
})
export class PersonsGrid extends DataGrid<DATA_TYPE, UpdatePersonsType> {
  /**
   * Stores the household ID when a user tries to change an address,
   * so it can be used in the confirmation dialog logic.
   */
  private _addressChangeModalId: string | null = null;

  /**
   * Column definitions for the grid.
   * Includes editable fields, tag rendering, and double-click address confirmation.
   */
  protected col: ColDef[] = [
    { field: 'first_name', headerName: 'First Name', editable: true },
    { field: 'last_name', headerName: 'Last Name', editable: true },
    { field: 'email', headerName: 'Email', editable: true },
    { field: 'mobile', headerName: 'Mobile', editable: true },
    { field: 'home_phone', headerName: 'Home phone', editable: false },
    {
      field: 'tags',
      filter: true,
      headerName: 'Tags',
      cellDataType: 'object',
      cellRendererParams: {
        type: 'persons',
        obj: UpdatePersonsObj,
        service: this.gridSvc,
      },
      cellRenderer: TagsCellRenderer,
      onCellDoubleClicked: this.openEditOnDoubleClick.bind(this),
      equals: (tagsA: string[], tagsB: string[]) => this.tagArrayEquals(tagsA, tagsB) === 0,
      valueFormatter: (params: ParamsType) => this.tagsToString(params.value),
      comparator: (tagsA: string[], tagsB: string[]) => this.tagArrayEquals(tagsA, tagsB),
    },
    {
      field: 'street_num',
      headerName: 'Street Number',
      editable: false,
      onCellDoubleClicked: this.confirmOpenEditOnDoubleClick.bind(this),
    },
    {
      field: 'apt',
      headerName: 'Apt',
      editable: false,
      onCellDoubleClicked: this.confirmOpenEditOnDoubleClick.bind(this),
    },
    {
      field: 'street1',
      headerName: 'Street 1',
      editable: false,
      onCellDoubleClicked: this.confirmOpenEditOnDoubleClick.bind(this),
    },
    {
      field: 'street2',
      headerName: 'Street 2',
      editable: false,
      onCellDoubleClicked: this.confirmOpenEditOnDoubleClick.bind(this),
    },
    {
      field: 'city',
      headerName: 'City',
      editable: false,
      onCellDoubleClicked: this.confirmOpenEditOnDoubleClick.bind(this),
    },
    {
      field: 'state',
      headerName: 'State/Province',
      editable: false,
      onCellDoubleClicked: this.confirmOpenEditOnDoubleClick.bind(this),
    },
    {
      field: 'zip',
      headerName: 'Zip/Province',
      editable: false,
      onCellDoubleClicked: this.confirmOpenEditOnDoubleClick.bind(this),
    },
    {
      field: 'country',
      headerName: 'Country',
      editable: false,
      onCellDoubleClicked: this.confirmOpenEditOnDoubleClick.bind(this),
    },
    { field: 'notes', headerName: 'Notes', editable: true },
  ];

  constructor() {
    super();
  }

  /**
   * Handles double-click events on address-related cells.
   * Triggers a modal confirmation dialog before navigating to household edit view.
   *
   * @param event - The ag-Grid cell event
   */
  protected confirmOpenEditOnDoubleClick(event: CellDoubleClickedEvent) {
    this._addressChangeModalId = event.data.household_id;
    this.confirmAddressChange();
  }

  /**
   * Navigates to the households detail page for the selected address.
   * Closes the modal dialog before navigating.
   */
  protected routeToHouseholds() {
    const dialog = document.querySelector('#confirmAddressEdit') as HTMLDialogElement;
    dialog.close();

    if (this._addressChangeModalId !== null) {
      this.router.navigate(['console', 'households', this._addressChangeModalId]);
    }
  }

  /**
   * Opens a modal dialog asking the user to confirm address redirection.
   */
  private confirmAddressChange(): void {
    const dialog = document.querySelector('#confirmAddressEdit') as HTMLDialogElement;
    dialog.showModal();
  }
}
