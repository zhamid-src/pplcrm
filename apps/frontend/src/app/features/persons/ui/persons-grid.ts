/**
 * @fileoverview Advanced data grid component for managing person records.
 * Provides comprehensive person management with inline editing, tag management,
 * and address confirmation workflows in a high-performance AG-Grid interface.
 */
import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { UpdatePersonsObj, UpdatePersonsType } from '@common';
import { Icon } from '@icons/icon';
import { DataGrid } from '@uxcommon/datagrid/datagrid';
import { tagArrayEquals, tagsToString } from '@uxcommon/datagrid/datagrid.utils';

import { CellDoubleClickedEvent, ColDef } from 'ag-grid-community';

import { AbstractAPIService } from '../../../abstract-api.service';
import { TagsCellRenderer } from '../../tags/ui/tags-cell-renderer';
import { DATA_TYPE, PersonsService } from '../services/persons-service';

interface ParamsType {
  value: string[];
}

/**
 * Advanced data grid component for comprehensive person record management.
 *
 * This component extends the base DataGrid to provide specialized functionality for
 * managing person records within the CRM system. It offers a rich set of features
 * including inline editing, tag management, and address handling with confirmation workflows.
 *
 * **Key Features:**
 * - **High-Performance Grid**: Built on AG-Grid for handling large datasets
 * - **Inline Editing**: Direct editing of person fields (name, email, mobile)
 * - **Tag Management**: Visual tag display and management with custom renderer
 * - **Address Integration**: Address fields with confirmation dialogs for changes
 * - **Advanced Filtering**: Tag-based filtering and column-specific filters
 * - **Responsive Design**: Optimized for various screen sizes
 * - **Smart Interactions**: Double-click editing with context-aware confirmations
 *
 * **Column Types:**
 * - **Editable Fields**: first_name, last_name, email, mobile (direct editing)
 * - **Address Fields**: street_num, apt, street1, street2, city (confirmation required)
 * - **Tags Column**: Custom renderer with filtering and management capabilities
 * - **Read-only Fields**: home_phone and other computed/derived fields
 *
 * **Address Confirmation Workflow:**
 * When users attempt to edit address fields, a confirmation dialog appears because
 * address changes affect the entire household, not just the individual person.
 *
 * @example
 * ```html
 * <!-- Basic usage -->
 * <pc-persons-grid></pc-persons-grid>
 *
 * <!-- With tag filtering -->
 * <pc-persons-grid [limitTags]="['VIP', 'Active']"></pc-persons-grid>
 * ```
 *
 * @extends DataGrid<DATA_TYPE, UpdatePersonsType>
 * @see {@link DataGrid} for base grid functionality
 * @see {@link TagsCellRenderer} for tag display and management
 * @see {@link PersonsService} for data operations
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
  private addressChangeModalId: string | null = null;

  /**
   * Column definitions for the grid.
   * Includes editable fields, tag rendering, and double-click address confirmation.
   */
  protected col: ColDef[] = [
    { field: 'first_name', headerName: 'First Name', editable: true, colId: 'first_name' },
    { field: 'last_name', headerName: 'Last Name', editable: true },
    { field: 'email', headerName: 'Email', editable: true },
    { field: 'mobile', headerName: 'Mobile', editable: true },
    { field: 'home_phone', headerName: 'Home phone', editable: false },
    {
      field: 'tags',
      colId: 'tags',
      filter: 'agSetColumnFilter',
      headerName: 'Tags',
      cellDataType: 'object',
      cellRendererParams: {
        type: 'persons',
        obj: UpdatePersonsObj,
        service: this.gridSvc,
      },
      cellRenderer: TagsCellRenderer,
      onCellDoubleClicked: this.openEditOnDoubleClick.bind(this),
      equals: (tagsA: string[], tagsB: string[]) => tagArrayEquals(tagsA, tagsB) === 0,
      valueFormatter: (params: ParamsType) => tagsToString(params.value),
      comparator: (tagsA: string[], tagsB: string[]) => tagArrayEquals(tagsA, tagsB),
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

  /** Tags used to limit grid results via DataGrid input. */
  protected limitTags: string[] = [];

  /**
   * Initializes the grid and retrieves tag filter data from the route.
   */
  constructor() {
    super();
    const route = inject(ActivatedRoute);
    this.limitTags = route.snapshot.data['tags'] ?? [];
  }

  /**
   * Handles double-click events on address-related cells.
   * Triggers a modal confirmation dialog before navigating to household edit view.
   *
   * @param event - The ag-Grid cell event
   */
  protected confirmOpenEditOnDoubleClick(event: CellDoubleClickedEvent) {
    this.addressChangeModalId = event.data.household_id;
    this.confirmAddressChange();
  }

  /**
   * Navigates to the households detail page for the selected address.
   * Closes the modal dialog before navigating.
   */
  protected routeToHouseholds() {
    const dialog = document.querySelector('#confirmAddressEdit') as HTMLDialogElement;
    dialog.close();

    if (this.addressChangeModalId !== null) {
      this.router.navigate(['console', 'households', this.addressChangeModalId]);
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
