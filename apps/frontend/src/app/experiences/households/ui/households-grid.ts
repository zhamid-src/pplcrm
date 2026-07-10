import { Component, inject, input, OnInit, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { DataGrid } from '@frontend/shared/components/datagrid/datagrid';
import { SECONDARY_CELL_CLASS } from '@frontend/shared/components/datagrid/grid-defaults';
import type { CellParams, ColumnDef as ColDef } from '@frontend/shared/components/datagrid/grid-defaults';
import { TagOptionsService } from '@frontend/shared/components/datagrid/services/tag-options.service';
import { DataGridUtilsService } from '@frontend/shared/components/datagrid/services/utils.service';
import { GrainTabs } from '@frontend/shared/components/grain-tabs/grain-tabs';
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
  imports: [DataGrid, GrainTabs, CsvImportComponent, FormsModule],
  template: `
    <div class="flex flex-col gap-6">
      <pc-datagrid
        #grid
        [showToolbar]="!inline()"
        [grainLayout]="!inline()"
        [fitColumns]="true"
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
        [totalSentence]="totalSentence()"
        (importCSV)="openImportDialog()"
        addRoute="add"
        i18n-addRoute
        plusIcon="add-home"
        i18n-plusIcon
      >
        <div pcGridBelowHeader>
          @if (!inline()) {
            <pc-grain-tabs />
          }
        </div>
        @if (!inline() && unhoused().count > 0) {
          <p pcGridFooterStart class="truncate text-xs text-base-content/55" i18n>
            <button
              type="button"
              class="cursor-pointer underline decoration-base-content/30 underline-offset-[3px] transition-colors hover:text-primary hover:decoration-primary"
              (click)="openUnhoused()"
            >
              {{ unhoused().count }} {{ unhoused().count === 1 ? 'person' : 'people' }}
            </button>
            {{ unhoused().count === 1 ? "doesn't" : "don't" }} belong to a household — no address, or one that can't be
            matched to a door.
          </p>
        }
      </pc-datagrid>
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
    provideDataGridConfig({
      messages: {
        entityNoun: 'household',
        entityNounPlural: 'households',
        exportEntity: 'households',
        exportFileName: 'households-export.csv',
      },
    }),
  ],
})
export class HouseholdsGrid implements OnInit {
  private readonly utils = inject(DataGridUtilsService);
  private readonly tagOptionsSvc = inject(TagOptionsService);
  private readonly personsSvc = inject(PersonsService);
  private readonly dialogSvc = inject(ConfirmDialogService);
  private readonly alertSvc = inject(AlertService);
  private readonly router = inject(Router);
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
      // The door that opens the household record: a generated address string, just like
      // the People grid's combined Name column. People count rides along as a muted subtitle.
      field: 'household',
      headerName: 'Household',
      editable: false,
      doorColumn: true,
      noHide: true,
      width: 260,
      minWidth: 180,
      valueGetter: (params: CellParams) => this.addressString(params.data),
      doorSubtitle: (params: CellParams) => {
        const n = Number((params.data as Record<string, unknown> | undefined)?.['persons_count'] ?? 0);
        return `${n} ${n === 1 ? 'person' : 'people'}`;
      },
    },
    {
      field: 'members',
      headerName: 'Members',
      editable: false,
      // Grows to fill leftover width when no notes/description column is visible.
      flex: true,
      width: 320,
      minWidth: 200,
      // Each member name is a link to their person card. The renderer output is
      // sanitized (event handlers stripped), so navigation is delegated to onCellClicked.
      cellRenderer: (params: CellParams) => this.renderMembers(params.value),
      onCellClicked: (params: CellParams) => this.onMemberClicked(params.event),
    },
    { field: 'city', headerName: 'City', editable: true, width: 150 },
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
    { field: 'district', headerName: 'District / Riding', editable: false, hide: true, minWidth: 140 },
    { field: 'precinct', headerName: 'Precinct / Polling Div.', editable: false, hide: true, minWidth: 180 },
    { field: 'ward', headerName: 'Ward', editable: false, minWidth: 100 },
    {
      field: 'updated_at',
      headerName: 'Last touch',
      editable: false,
      minWidth: 120,
      valueFormatter: (params: CellParams) => this.formatLastTouch(params.value),
    },
    {
      field: 'notes',
      headerName: 'Notes',
      editable: true,
      hide: true,
      width: 280,
      cellEditorParams: { textarea: true, rows: 5 },
    },
  ];
  public listId = input<string | null>(null);
  public showHeader = input<boolean>(true);

  protected importSummary = signal<CsvImportSummary | null>(null);

  // Importer state
  protected importerOpen = signal(false);
  protected tagsInput = '';

  /** Grain total sentence for the header (spec §5): "{n} households across {m} wards". */
  protected readonly totalSentence = signal<string | null>(null);

  /** People with no matchable address (the placeholder household) — footer note + link target. */
  protected readonly unhoused = signal<{ count: number; household_id: string | null }>({
    count: 0,
    household_id: null,
  });

  public ngOnInit(): void {
    // Mute the secondary columns so the bold "Household" door reads as the way in. Members
    // keep full contrast — they're a second focal point (the People-grain of the household).
    for (const c of this.col) if (!c.doorColumn && c.field !== 'members') c.cellClass = SECONDARY_CELL_CLASS;

    void this.loadOnInit();
  }

  private async loadOnInit(): Promise<void> {
    await this.loadTagOptions();
    await this.loadIssueOptions();
    void this.loadGrainSentence();
    if (!this.inline()) void this.loadUnhoused();
  }

  private async loadUnhoused(): Promise<void> {
    try {
      this.unhoused.set(await this.householdsService.getUnhoused());
    } catch (err) {
      console.error('Failed to load unhoused people count', err);
    }
  }

  /** Opens the placeholder household, whose detail view lists everyone with no address. */
  protected openUnhoused(): void {
    const id = this.unhoused().household_id;
    if (id) void this.router.navigate(['/households', id]);
  }

  private async loadGrainSentence(): Promise<void> {
    try {
      const [total, wards] = await Promise.all([
        this.householdsService.count(),
        this.householdsService.countDistinctWards(),
      ]);
      const fmt = new Intl.NumberFormat();
      const households = total === 1 ? '1 household' : `${fmt.format(total)} households`;
      // Ward data comes from geocoding; until any exists, fall back to a plain total.
      this.totalSentence.set(
        wards > 0
          ? `${households} across ${fmt.format(wards)} ${wards === 1 ? 'ward' : 'wards'}`
          : `${households} total`,
      );
    } catch (err) {
      console.error('Failed to load household grain counts', err);
    }
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

  /** Renders member names as person-card links; a comma separator keeps them on one line. */
  private renderMembers(value: unknown): string {
    const members = Array.isArray(value) ? (value as Array<{ id?: unknown; name?: unknown }>) : [];
    const links = members
      .filter((m) => m && m.id != null && typeof m.name === 'string' && m.name.trim().length)
      .map((m) => {
        const id = this.escapeHtml(String(m.id));
        const name = this.escapeHtml(String(m.name));
        return `<a data-person-id="${id}" class="cursor-pointer hover:text-primary hover:underline underline-offset-[3px]">${name}</a>`;
      });
    if (!links.length) return '';
    // Block root truncates at the cell width; inline links stay on one line (not wrapped).
    return `<span class="block truncate">${links.join('<span class="text-base-content/40">, </span>')}</span>`;
  }

  /** Delegated navigation for a clicked member link (renderer HTML can't hold Angular handlers). */
  private onMemberClicked(event: Event | undefined): void {
    const target = event?.target;
    if (!(target instanceof HTMLElement)) return;
    const anchor = target.closest('[data-person-id]');
    const id = anchor?.getAttribute('data-person-id');
    if (id) void this.router.navigate(['/people', id]);
  }

  private escapeHtml(value: string): string {
    return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  /** Street number + name for the Household door column (city has its own column). */
  private addressString(data: unknown): string {
    const d = data as Record<string, unknown> | undefined;
    if (!d) return '';
    if (d['is_placeholder']) return 'People with no addresses';
    return [d['street_num'], d['street1']].filter(Boolean).join(' ').trim();
  }

  /** Compact relative "last touch" — matches the household view's low-chrome style. */
  private formatLastTouch(value: unknown): string {
    if (value == null || (typeof value !== 'string' && !(value instanceof Date))) return '';
    const then = new Date(value).getTime();
    if (Number.isNaN(then)) return '';
    const diffDays = Math.floor((Date.now() - then) / (1000 * 60 * 60 * 24));
    if (diffDays <= 0) return 'today';
    if (diffDays === 1) return 'yesterday';
    if (diffDays < 30) return `${diffDays}d ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
    return `${Math.floor(diffDays / 365)}y ago`;
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
