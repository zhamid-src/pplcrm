/**
 * @fileoverview Advanced data grid component for managing person records.
 * Provides comprehensive person management with inline editing, tag management,
 * and address confirmation workflows.
 */
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { UpdatePersonsObj, UpdatePersonsType } from '@common';
import { Icon } from '@icons/icon';
import { DataGrid } from '@uxcommon/components/datagrid/datagrid';
import { CsvImportComponent, type CsvImportSummary } from '@uxcommon/components/csv-import/csv-import';
import { DataGridUtilsService } from '@uxcommon/components/datagrid/services/utils.service';

import type { ColumnDef as ColDef } from '@uxcommon/components/datagrid/grid-defaults';

import { AbstractAPIService } from '../../../services/api/abstract-api.service';
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
 * - **High-Performance Grid**: Efficient rendering for large datasets
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
 * @see tag valueFormatter in column defs for tag display
 * @see {@link PersonsService} for data operations
 */
@Component({
  selector: 'pc-persons-grid',
  imports: [DataGrid, Icon, FormsModule, CsvImportComponent],
  templateUrl: './persons-grid.html',
  providers: [{ provide: AbstractAPIService, useClass: PersonsService }],
})
export class PersonsGrid extends DataGrid<DATA_TYPE, UpdatePersonsType> {
  private readonly utils = inject(DataGridUtilsService);

  /**
   * Stores the household ID when a user tries to change an address,
   * so it can be used in the confirmation dialog logic.
   */
  private addressChangeModalId: string | null = null;
  private importProgressTimer: any;

  protected readonly mappableFields = [
    'first_name',
    'middle_names',
    'last_name',
    'email',
    'email2',
    'mobile',
    'home_phone',
    'street_num',
    'street1',
    'street2',
    'apt',
    'city',
    'state',
    'zip',
    'country',
    'notes',
  ];

  /**
   * Column definitions for the grid.
   * Includes editable fields, tag rendering, and double-click address confirmation.
   */
  protected col: ColDef[] = [
    { field: 'first_name', headerName: 'First Name', editable: true },
    { field: 'last_name', headerName: 'Last Name', editable: true },
    { field: 'email', headerName: 'Email', editable: true },
    { field: 'mobile', headerName: 'Mobile', editable: true },
    {
      field: 'home_phone',
      headerName: 'Home phone',
      editable: false,
      onCellDoubleClicked: this.confirmOpenEditOnDoubleClick.bind(this),
    },
    {
      field: 'tags',
      headerName: 'Tags',
      cellDataType: 'object',
      cellRendererParams: {
        type: 'persons',
        obj: UpdatePersonsObj,
        service: this.gridSvc,
      },
      // cellRenderer removed; valueFormatter renders tags
      onCellDoubleClicked: this.openEditOnDoubleClick.bind(this),
      equals: (tagsA: string[], tagsB: string[]) => this.utils.tagArrayEquals(tagsA, tagsB) === 0,
      valueFormatter: (params: ParamsType) => this.utils.tagsToString(params.value),
      comparator: (tagsA: string[], tagsB: string[]) => this.utils.tagArrayEquals(tagsA, tagsB),
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

  // Generic CSV importer integration
  protected importerOpen = signal(false);
  protected importSummary = signal<CsvImportSummary | null>(null);

  /** Tags used to limit grid results via DataGrid input. */
  protected limitTags: string[] = [];
  protected tagsInput = '';

  /**
   * Initializes the grid and retrieves tag filter data from the route.
   */
  constructor() {
    super();
    const route = inject(ActivatedRoute);
    this.limitTags = route.snapshot.data['tags'] ?? [];
  }

  // paging/preview managed by CsvImportComponent

  /**
   * Handles double-click events on address-related cells.
   * Triggers a modal confirmation dialog before navigating to household edit view.
   * @param event - The cell event carrying row data
   */
  protected confirmOpenEditOnDoubleClick(event: any) {
    this.addressChangeModalId = event?.data?.household_id ?? event?.household_id;
    this.confirmAddressChange();
  }

  // --- Import CSV Flow ---
  protected openImportDialog() {
    // Clear any prior summary to avoid stale dialogs
    this.importSummary.set(null);
    this.tagsInput = '';
    if (this.importProgressTimer) clearInterval(this.importProgressTimer);
    this.importerOpen.set(true);
  }

  /**
   * Navigates to the households detail page for the selected address.
   * Closes the modal dialog before navigating.
   */
  protected routeToHouseholds() {
    const dialog = document.querySelector('#confirmAddressEdit') as HTMLDialogElement;
    dialog.close();

    if (this.addressChangeModalId !== null) {
      this.router.navigate(['households', this.addressChangeModalId]);
    }
  }


  protected async onImportSubmit(rows: Array<Record<string, string>>, skippedArg?: number): Promise<void>;
  protected async onImportSubmit(payload: { rows: Array<Record<string, string>>; skipped: number }): Promise<void>;
  protected async onImportSubmit(a: any, b?: any) {
    const rows: Array<Record<string, string>> = Array.isArray(a) ? a : a?.rows;
    const skippedComputed: number = Array.isArray(a) ? Number(b) || 0 : Number(a?.skipped) || 0;
    // Merge route-derived filter tags (e.g., 'volunteer', 'donor') with user-provided tags
    const inputTags = this.tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter((t) => !!t);
    const combined = new Set<string>([...this.limitTags, ...inputTags]);
    const tags = Array.from(combined);

    try {
      const res = (await (this.gridSvc as PersonsService).import(rows, tags)) as any;
      const inserted = res?.inserted ?? 0;
      const errors = res?.errors ?? 0;
      const diag: string[] = [];
      if (typeof res?.persons_total_before === 'number' && typeof res?.persons_total_after === 'number') {
        diag.push(`Total before/after: ${res.persons_total_before} → ${res.persons_total_after}`);
      }
      if (typeof res?.households_created === 'number') {
        diag.push(`Households created: ${res.households_created}`);
      }
      if (res?.tenant_id) diag.push(`Tenant: ${res.tenant_id}`);
      if (res?.campaign_id) diag.push(`Campaign: ${res.campaign_id}`);
      const msg = diag.join(' • ');
      this.importSummary.set({ inserted, errors, skipped: skippedComputed, tag: res?.tag, failed: false, message: msg });
      this.importerOpen.set(false);
      await this.refresh();
    } catch (e: any) {
      const msg = e?.message || e?.data?.message || 'Import failed';
      this.importSummary.set({ inserted: 0, errors: 0, skipped: skippedComputed, failed: true, message: msg });
      this.importerOpen.set(false);
    }
  }

  public autoMapHeader(h: string): string {
    const raw = (h || '').toLowerCase().trim();
    const key = raw.replace(/[^a-z0-9]/g, '');
    const map: Record<string, string> = {
      firstname: 'first_name',
      fname: 'first_name',
      middlename: 'middle_names',
      lastname: 'last_name',
      lname: 'last_name',
      name: 'first_name',
      email: 'email',
      emailaddress: 'email',
      email1address: 'email',
      email2: 'email2',
      email2address: 'email2',
      mobile: 'mobile',
      mobilephone: 'mobile',
      cellphone: 'mobile',
      primaryphone: 'mobile',
      businessphone: 'mobile',
      homephone: 'home_phone',
      streetnum: 'street_num',
      streetnumber: 'street_num',
      homestreet: 'street1',
      homestreet1: 'street1',
      homestreet2: 'street2',
      homestreet3: 'street2',
      homeaddress: 'street1',
      homeaddresspobox: 'street2',
      homecity: 'city',
      homestate: 'state',
      homepostalcode: 'zip',
      homecountry: 'country',
      businessstreet: 'street1',
      businessstreet1: 'street1',
      businessstreet2: 'street2',
      businessstreet3: 'street2',
      businessaddress: 'street1',
      businessaddresspobox: 'street2',
      businesscity: 'city',
      businessstate: 'state',
      businesspostalcode: 'zip',
      businesscountry: 'country',
      address1: 'street1',
      address2: 'street2',
      street1: 'street1',
      street2: 'street2',
      apt: 'apt',
      apartment: 'apt',
      city: 'city',
      state: 'state',
      province: 'state',
      zip: 'zip',
      postal: 'zip',
      country: 'country',
      notes: 'notes',
      note: 'notes',
    };
    return map[key] || '';
  }

  /**
   * Opens a modal dialog asking the user to confirm address redirection.
   */
  private confirmAddressChange(): void {
    const dialog = document.querySelector('#confirmAddressEdit') as HTMLDialogElement;
    dialog.showModal();
  }

  // worker-based parsing; old incremental parser removed
}
