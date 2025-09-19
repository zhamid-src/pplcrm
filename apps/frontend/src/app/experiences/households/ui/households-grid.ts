/**
 * @file Grid component for listing households with counts and tags.
 */
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { UpdateHouseholdsObj } from '@common';
import { CsvImportComponent, type CsvImportSummary } from '@uxcommon/components/csv-import/csv-import';
import { DataGrid } from '@uxcommon/components/datagrid/datagrid';
import { DataGridUtilsService } from '@uxcommon/components/datagrid/services/utils.service';

import { AbstractAPIService } from '../../../services/api/abstract-api.service';
import { HouseholdsService } from '../services/households-service';

interface ParamsType {
  value: string[];
}

@Component({
  selector: 'pc-households-grid',
  imports: [DataGrid, CsvImportComponent, FormsModule],
  template: `
    <pc-datagrid
      [colDefs]="col"
      [disableDelete]="true"
      [disableView]="false"
      [disableImport]="false"
      (importCSV)="openImportDialog()"
      addRoute="add"
      plusIcon="add-home"
    ></pc-datagrid>

    <!-- Reusable CSV Importer for Households -->
    <pc-csv-importer
      [open]="importerOpen()"
      [title]="'Import Households from CSV'"
      [mappableFields]="mappableFields"
      [autoMapHeader]="autoMapHeader"
      [summary]="importSummary()"
      (submit)="onImportSubmit($event)"
      (close)="importerOpen.set(false); importSummary.set(null)"
      (closeSummary)="importSummary.set(null)"
    >
      <div pc-import-extras class="grid gap-2">
        <label class="font-semibold">3) Add tags to all imported rows (optional)</label>
        <input
          class="input input-bordered"
          placeholder="Comma separated e.g. neighborhood, parish"
          [(ngModel)]="tagsInput"
        />
      </div>
    </pc-csv-importer>
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

  protected readonly mappableFields: string[] = [
    'street_num',
    'apt',
    'street1',
    'street2',
    'city',
    'state',
    'zip',
    'country',
    'home_phone',
    'notes',
  ];

  protected autoMapHeader = (h: string): string => {
    const raw = (h || '').toLowerCase().trim();
    const key = raw.replace(/[^a-z0-9]/g, '');
    const map: Record<string, string> = {
      streetnum: 'street_num',
      streetnumber: 'street_num',
      homestreet: 'street1',
      homestreet1: 'street1',
      homestreet2: 'street2',
      homestreet3: 'street2',
      homeaddress: 'street1',
      homeaddresspobox: 'street2',
      businessstreet: 'street1',
      businessstreet1: 'street1',
      businessstreet2: 'street2',
      businessstreet3: 'street2',
      businessaddress: 'street1',
      businessaddresspobox: 'street2',
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
      homephone: 'home_phone',
      phone: 'home_phone',
      notes: 'notes',
      note: 'notes',
    };
    return map[key] || '';
  };

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
  protected importSummary = signal<CsvImportSummary | null>(null);

  // Importer state
  protected importerOpen = signal(false);
  protected tagsInput = '';

  /**
   * Constructor: Calls the parent constructor of DataGrid
   */
  constructor() {
    super();
  }

  protected onImportSubmit(payload: { rows: Array<Record<string, string>>; skipped: number }) {
    // Backend households import endpoint not implemented yet; show informative summary
    const diag = 'Households import is not available yet.';
    this.importSummary.set({ inserted: 0, errors: 0, skipped: payload.skipped, failed: true, message: diag });
    this.importerOpen.set(false);
  }

  protected openImportDialog() {
    this.importSummary.set(null);
    this.tagsInput = '';
    this.importerOpen.set(true);
  }
}
