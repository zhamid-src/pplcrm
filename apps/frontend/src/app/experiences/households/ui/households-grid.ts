import { Component, inject, input, OnInit, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DataGrid } from '@frontend/shared/components/datagrid/datagrid';
import type { CellParams, ColumnDef as ColDef } from '@frontend/shared/components/datagrid/grid-defaults';
import { TagOptionsService } from '@frontend/shared/components/datagrid/services/tag-options.service';
import { DataGridUtilsService } from '@frontend/shared/components/datagrid/services/utils.service';
import { CsvImportComponent, type CsvImportSummary } from '@uxcommon/components/csv-import/csv-import';
import { UpdateHouseholdsObj } from '../../../../../../../libs/common/src';

import { provideDataGridConfig } from '@frontend/shared/components/datagrid/datagrid.tokens';
import { AlertService } from '@uxcommon/components/alerts/alert-service';
import { createLoadingGate } from '@uxcommon/loading-gate';
import { AbstractAPIService } from '../../../services/api/abstract-api.service';
import { ConfirmDialogService } from '../../../services/shared-dialog.service';
import { PersonsService } from '../../persons/services/persons-service';
import { HouseholdsService } from '../services/households-service';

@Component({
  selector: 'pc-households-grid',
  imports: [DataGrid, CsvImportComponent, FormsModule],
  template: `
    <div class="flex flex-col gap-6">
      <pc-datagrid
        #grid
        [showToolbar]="!inline()"
        title="Households"
        i18n-title
        description="Manage household groups, track shared addresses, and organize family relationships."
        i18n-description
        [listId]="listId()"
        [colDefs]="col"
        [disableDelete]="false"
        [disableMerge]="false"
        [disableView]="false"
        [disableImport]="false"
        [confirmDeleteOverride]="onConfirmDeleteBind"
        [rowCanSelect]="rowCanSelectFn"
        (importCSV)="openImportDialog()"
        addRoute="add"
        i18n-addRoute
        plusIcon="add-home"
        i18n-plusIcon
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
        <label i18n class="font-semibold">3) Add tags to all imported rows (optional)</label>
        <input
          class="input input-bordered"
          placeholder="Comma separated e.g. neighborhood, parish"
          i18n-placeholder
          [(ngModel)]="tagsInput"
        />
      </div>
    </pc-csv-importer>
  `,
  providers: [
    { provide: AbstractAPIService, useExisting: HouseholdsService },
    provideDataGridConfig({ messages: { exportEntity: 'households', exportFileName: 'households-export.csv' } }),
  ],
})
export class HouseholdsGrid implements OnInit {
  private readonly utils = inject(DataGridUtilsService);
  private readonly tagOptionsSvc = inject(TagOptionsService);
  private readonly personsSvc = inject(PersonsService);
  private readonly dialogSvc = inject(ConfirmDialogService);
  private readonly alertSvc = inject(AlertService);
  public readonly _loading = createLoadingGate();
  private readonly householdsService = inject(HouseholdsService);

  private readonly grid = viewChild<DataGrid<'households', never>>('grid');

  private tagOptionValues: string[] = [];
  private issueOptionValues: string[] = [];
  public readonly onConfirmDeleteBind = (selected: any[]) => this.confirmDelete(selected);
  public readonly rowCanSelectFn = (row: any) => !row.is_placeholder;

  public inline = input<boolean>(false);

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
        service: this.householdsService,
        tagType: 'tag',
      },
      cellEditorParams: () => ({ values: this.tagOptionValues, multiple: true }),
      equals: (tagsA: unknown, tagsB: unknown) =>
        this.utils.tagArrayEquals(this.utils.normalizeTagSelection(tagsA), this.utils.normalizeTagSelection(tagsB)) ===
        0,
      valueFormatter: (params: CellParams) => this.utils.tagsToString(this.utils.normalizeTagSelection(params.value)),
      comparator: (tagsA: unknown, tagsB: unknown) =>
        this.utils.tagArrayEquals(this.utils.normalizeTagSelection(tagsA), this.utils.normalizeTagSelection(tagsB)),
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
        service: this.householdsService,
        tagType: 'issue',
      },
      cellEditorParams: () => ({ values: this.issueOptionValues, multiple: true }),
      equals: (tagsA: unknown, tagsB: unknown) =>
        this.utils.tagArrayEquals(this.utils.normalizeTagSelection(tagsA), this.utils.normalizeTagSelection(tagsB)) ===
        0,
      valueFormatter: (params: CellParams) => this.utils.tagsToString(this.utils.normalizeTagSelection(params.value)),
      comparator: (tagsA: unknown, tagsB: unknown) =>
        this.utils.tagArrayEquals(this.utils.normalizeTagSelection(tagsA), this.utils.normalizeTagSelection(tagsB)),
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
  public listId = input<string | null>(null);
  public showHeader = input<boolean>(true);

  protected importSummary = signal<CsvImportSummary | null>(null);

  // Importer state
  protected importerOpen = signal(false);
  protected tagsInput = '';

  public ngOnInit(): void {
    void this.loadOnInit();
  }

  private async loadOnInit(): Promise<void> {
    await this.loadTagOptions();
    await this.loadIssueOptions();
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

  protected openEditOnDoubleClick(event: any) {
    this.grid()?.openEditOnDoubleClick(event?.data ?? event);
  }

  protected async confirmDelete(selectedRows?: any[]): Promise<boolean> {
    const selected = (selectedRows || this.grid()?.getSelectedRows() || []) as Array<{
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
        await Promise.all(
          personIds.map((pid) =>
            this.personsSvc.removeHousehold(pid).catch(() => {
              // best-effort; continue
            }),
          ),
        );
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
        await this.householdsService.deleteMany(householdIds);
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
