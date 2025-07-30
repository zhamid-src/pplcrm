import { CellDoubleClickedEvent, ColDef } from 'ag-grid-community';
import { Component } from '@angular/core';
import { UpdatePersonsObj, UpdatePersonsType } from '@common';
import { DataGrid } from '@uxcommon/datagrid/datagrid';
import { Icon } from '@uxcommon/icon';

import { AbstractAPIService } from '../../abstract-api.service';
import { DATA_TYPE, PersonsService } from '../persons/persons-service';
import { TagsCellRenderer } from '../tags/tags-cell-renderer';

interface ParamsType {
  value: string[];
}

/**
 * A data grid component to display and edit donor (person) records.
 * Inherits generic grid logic from `DataGrid`, including editing,
 * custom renderers, and navigation behaviors.
 */
@Component({
  selector: 'pc-donors-grid',
  imports: [DataGrid, Icon],
  templateUrl: './donors-grid.html',
  providers: [{ provide: AbstractAPIService, useClass: PersonsService }],
})
export class DonorsGrid extends DataGrid<DATA_TYPE, UpdatePersonsType> {
  /** Household ID to use when routing after confirming address change */
  private _addressChangeModalId: string | null = null;

  /**
   * Column definitions for the ag-grid, including editable fields,
   * custom renderers, double-click actions, and comparison logic.
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
      headerName: 'Street1',
      editable: false,
      onCellDoubleClicked: this.confirmOpenEditOnDoubleClick.bind(this),
    },
    {
      field: 'street2',
      headerName: 'Street2',
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
   * Handle double-click on address-related fields.
   * Stores the `household_id` and prompts confirmation modal.
   *
   * @param event - The cell double-click event
   */
  protected confirmOpenEditOnDoubleClick(event: CellDoubleClickedEvent) {
    this._addressChangeModalId = event.data.household_id;
    this.confirmAddressChange();
  }

  /**
   * Navigates to the household route after user confirms address change.
   */
  protected routeToHouseholds() {
    const dialog = document.querySelector('#confirmAddressEdit') as HTMLDialogElement;
    dialog.close();

    if (this._addressChangeModalId !== null) {
      this.router.navigate(['console', 'households', this._addressChangeModalId]);
    }
  }

  /**
   * Opens the confirmation modal dialog to ask if the user
   * truly intends to edit the address.
   */
  private confirmAddressChange(): void {
    const dialog = document.querySelector('#confirmAddressEdit') as HTMLDialogElement;
    dialog.showModal();
  }
}
