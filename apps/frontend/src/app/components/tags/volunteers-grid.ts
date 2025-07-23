import { CellDoubleClickedEvent, ColDef } from '@ag-grid-community/core';

import { Component } from '@angular/core';
import { UpdatePersonsObj, UpdatePersonsType } from '@common';
import { DataGrid } from '@uxcommon/datagrid';
import { Icon } from '@uxcommon/icon';
import { TagsCellRenderer } from './tags-cell-renderer';
import { PersonsService, DATA_TYPE } from '../persons/persons-service';
import { AbstractAPIService } from '../../abstract.service';

interface ParamsType {
  value: string[];
}

/**
 * A grid component for displaying and editing volunteer information using the `DataGrid` base class.
 *
 * This component extends `DataGrid` and defines columns such as name, contact info, tags, and address fields.
 * It also handles double-click events to confirm address edits and navigate to associated household details.
 *
 * It uses `PersonsService` as its backing API service.
 */
@Component({
  selector: 'pc-volunteers-grid',
  imports: [DataGrid, Icon],
  templateUrl: './volunteers-grid.html',
  providers: [{ provide: AbstractAPIService, useClass: PersonsService }],
})
export class VolunteersGrid extends DataGrid<DATA_TYPE, UpdatePersonsType> {
  /**
   * Column definitions for the ag-grid table.
   * Includes editable fields and custom tag rendering with comparator logic.
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
      field: 'street',
      headerName: 'Street',
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

  /**
   * Stores the `household_id` of the selected row when address edit is triggered.
   * Used to route the user after confirmation.
   */
  private addressChangeModalId: string | null = null;

  constructor() {
    super();
  }

  /**
   * Triggered when an address-related cell is double-clicked.
   * Opens a confirmation modal and stores the related household ID.
   *
   * @param event - The cell double-click event containing row data.
   */
  protected confirmOpenEditOnDoubleClick(event: CellDoubleClickedEvent) {
    this.addressChangeModalId = event.data.household_id;
    this.confirmAddressChange();
  }

  /**
   * Called after the user confirms they want to edit an address.
   * Closes the modal and navigates to the relevant household detail page.
   */
  protected routeToHouseholds() {
    const dialog = document.querySelector('#confirmAddressEdit') as HTMLDialogElement;
    dialog.close();

    if (this.addressChangeModalId !== null) {
      this.router.navigate(['console', 'households', this.addressChangeModalId]);
    }
  }

  /**
   * Opens the address confirmation modal to confirm user intent
   * before routing to household details.
   */
  private confirmAddressChange(): void {
    const dialog = document.querySelector('#confirmAddressEdit') as HTMLDialogElement;
    dialog.showModal();
  }
}
