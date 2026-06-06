/**
 * @file Grid component for listing households with counts and tags.
 */
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { UpdateHouseholdsObj } from '@common';
import { CsvImportComponent, type CsvImportSummary } from '@uxcommon/components/csv-import/csv-import';
import { DataGrid } from '@uxcommon/components/datagrid/datagrid';
import { DataGridUtilsService } from '@uxcommon/components/datagrid/services/utils.service';
import { TagOptionsService } from '@uxcommon/components/datagrid/services/tag-options.service';
import { GridHeaderComponent } from '@uxcommon/components/grid-header/grid-header';
import type { ColumnDef as ColDef } from '@uxcommon/components/datagrid/grid-defaults';

import { AbstractAPIService } from '../../../services/api/abstract-api.service';
import { HouseholdsService } from '../services/households-service';
import { PersonsService } from '../../persons/services/persons-service';
import { ConfirmDialogService } from '../../../services/shared-dialog.service';

interface ParamsType {
  value: string[];
}

@Component({
  selector: 'pc-households-grid',
  imports: [DataGrid, CsvImportComponent, FormsModule, GridHeaderComponent],
  template: `
    <div class="flex flex-col gap-6">
      <!-- Title Header -->
      <pc-grid-header
        title="Households"
        description="Manage household groups, track shared addresses, and organize family relationships."
      ></pc-grid-header>

      <pc-datagrid
        [colDefs]="col"
        [disableDelete]="false"
        [disableView]="false"
        [disableImport]="false"
        [confirmDeleteOverride]="onConfirmDeleteBind"
        [rowCanSelect]="rowCanSelectFn"
        (importCSV)="openImportDialog()"
        addRoute="add"
        plusIcon="add-home"
      ></pc-datagrid>
    </div>

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
  providers: [{ provide: AbstractAPIService, useExisting: HouseholdsService }],
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
  private readonly tagOptionsSvc = inject(TagOptionsService);
  private readonly personsSvc = inject(PersonsService);
  private readonly dialogSvc = inject(ConfirmDialogService);
  private tagOptionValues: string[] = [];
  private issueOptionValues: string[] = [];
  public readonly onConfirmDeleteBind = (selected: any[]) => this.confirmDelete(selected);
  public readonly rowCanSelectFn = (row: any) => !row.is_placeholder;

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
  protected col: ColDef[] = [
    {
      field: 'persons_count',
      headerName: 'People',
      onCellDoubleClicked: this.openEditOnDoubleClick.bind(this),
    },
    { field: 'street_num', headerName: 'Street Number', editable: true },
    { field: 'apt', headerName: 'Apt', editable: true },
    {
      field: 'street1',
      headerName: 'Street 1',
      editable: true,
      valueFormatter: (params: any) =>
        params.data?.is_placeholder ? 'People with no addresses' : (params.value ?? ''),
    },
    { field: 'street2', headerName: 'Street 2', editable: true },
    { field: 'city', headerName: 'City', editable: true },
    {
      field: 'tags',
      headerName: 'Tags',
      hide: true,
      editable: true,
      tagColumn: true,
      cellDataType: 'object',
      cellRendererParams: {
        type: 'households',
        obj: UpdateHouseholdsObj,
        service: this.gridSvc,
        tagType: 'tag',
      },
      cellEditorParams: () => ({ values: this.tagOptionValues, multiple: true }),
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
    {
      field: 'issues',
      hide: true,
      headerName: 'Issues',
      editable: true,
      tagColumn: true,
      cellDataType: 'object',
      cellRendererParams: {
        type: 'households',
        obj: UpdateHouseholdsObj,
        service: this.gridSvc,
        tagType: 'issue',
      },
      cellEditorParams: () => ({ values: this.issueOptionValues, multiple: true }),
      equals: (tagsA: string[], tagsB: string[]) => this.utils.tagArrayEquals(tagsA, tagsB) === 0,
      valueFormatter: (params: ParamsType) => this.utils.tagsToString(params.value),
      comparator: (tagsA: string[], tagsB: string[]) => this.utils.tagArrayEquals(tagsA, tagsB),
    },
    { field: 'state', headerName: 'State/Province', editable: true },
    { field: 'zip', headerName: 'Zip/Province', editable: true },
    { field: 'country', headerName: 'Country', editable: true },
    { field: 'district', headerName: 'District / Riding', editable: false, minWidth: 140 },
    { field: 'precinct', headerName: 'Precinct / Polling Div.', editable: false, minWidth: 180 },
    { field: 'ward', headerName: 'Ward', editable: false, minWidth: 100 },
    { field: 'home_phone', headerName: 'Home phone', editable: true },
    {
      field: 'notes',
      headerName: 'Notes',
      editable: true,
      cellEditorParams: { textarea: true, rows: 5 },
    },
  ];
  protected importSummary = signal<CsvImportSummary | null>(null);

  // Importer state
  protected importerOpen = signal(false);
  protected tagsInput = '';

  public override async ngOnInit() {
    await this.loadTagOptions();
    await this.loadIssueOptions();
    await super.ngOnInit();
  }

  private async loadTagOptions() {
    try {
      this.tagOptionValues = await this.tagOptionsSvc.getTagNames('tag');
    } catch {
      this.tagOptionValues = [];
    }
  }

  private async loadIssueOptions() {
    try {
      this.issueOptionValues = await this.tagOptionsSvc.getTagNames('issue');
    } catch {
      this.issueOptionValues = [];
    }
  }

  /**
   * Constructor: Calls the parent constructor of DataGrid
   */
  constructor() {
    super();
  }

  /**
   * Override delete to warn the user when selected households have people attached.
   * Offers three choices: delete people too, keep people and remove address, or cancel.
   */
  protected override async confirmDelete(selectedRows?: any[]): Promise<boolean> {
    const selected = (selectedRows || this.getSelectedRows()) as Array<{
      id: string;
      persons_count?: number | string | null;
      is_placeholder?: boolean;
    }>;

    if (!selected.length) {
      this.alertSvc.showError('No rows selected.');
      return true;
    }

    // Guard: the tenant's placeholder household is permanent and cannot be deleted.
    if (selected.some((r) => r.is_placeholder)) {
      this.alertSvc.showError('The placeholder household cannot be deleted. It holds people who have no address.');
      return true;
    }

    // Collect IDs for households that have people
    const populated = selected.filter((r) => Number(r.persons_count ?? 0) > 0);
    const householdIds = selected.map((r) => r.id);

    if (populated.length > 0) {
      // Fetch person IDs for all households-with-people so we can act on them
      const personIdArrays = await Promise.all(
        populated.map(async (h) => {
          try {
            const people = (await this.personsSvc.getByHouseholdId(h.id, { columns: ['id'] })) as Array<{ id: string }>;
            return people.map((p) => p.id);
          } catch {
            return [];
          }
        }),
      );
      const personIds = personIdArrays.flat();
      const peopleCount = personIds.length;

      // Show the 3-option dialog and wait for user's choice
      const choice = await this.dialogSvc.choose<'delete-people' | 'keep-people'>({
        title: 'Households have people',
        message: `${populated.length} household(s) being deleted contain ${peopleCount} person(s).\nWhat would you like to do with those people?`,
        variant: 'warning',
        choices: [
          { label: 'Delete people too', value: 'delete-people', variant: 'danger' },
          { label: 'Keep people, just remove their address', value: 'keep-people', variant: 'warning' },
        ],
        cancelText: 'Cancel',
      });

      if (!choice) return true; // Handled (user clicked Cancel, so do nothing)

      if (choice === 'keep-people') {
        // Detach each person from their household (moves to blank household)
        for (const pid of personIds) {
          try {
            await this.personsSvc.removeHousehold(pid);
          } catch {
            // best-effort; continue
          }
        }
      } else if (choice === 'delete-people') {
        // Delete all people in those households first
        if (personIds.length) {
          try {
            await this.personsSvc.deleteMany(personIds);
          } catch {
            this.alertSvc.showError('Failed to delete people. Aborting household deletion.');
            return true;
          }
        }
      }

      // Now delete the households themselves
      try {
        await this.gridSvc.deleteMany(householdIds);
        this.alertSvc.showSuccess('Households deleted successfully.');
      } catch {
        this.alertSvc.showError('Failed to delete one or more households.');
      }
      return true;
    } else {
      // No people attached — delegate to the standard flow
      return false;
    }
  }

  protected onImportSubmit(payload: {
    rows: Array<Record<string, string>>;
    skipped: number;
    fileName?: string | null;
  }) {
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
