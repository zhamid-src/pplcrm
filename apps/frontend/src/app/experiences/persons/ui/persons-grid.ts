import { Component, inject, input, OnInit, signal, viewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DataGrid } from '@frontend/shared/components/datagrid/datagrid';
import { TagOptionsService } from '@frontend/shared/components/datagrid/services/tag-options.service';
import { DataGridUtilsService } from '@frontend/shared/components/datagrid/services/utils.service';
import { GrainTabs } from '@frontend/shared/components/grain-tabs/grain-tabs';
import { Icon } from '@icons/icon';
import { PcIconNameType } from '@icons/icons.index';
import { UpdatePersonsObj, UpdatePersonsType } from '../../../../../../../libs/common/src';

import type { CellParams, ColumnDef as ColDef } from '@frontend/shared/components/datagrid/grid-defaults';
import { SECONDARY_CELL_CLASS } from '@frontend/shared/components/datagrid/grid-defaults';

import {
  DATA_GRID_CONFIG,
  DEFAULT_DATA_GRID_CONFIG,
  provideDataGridConfig,
} from '@frontend/shared/components/datagrid/datagrid.tokens';
import { AlertService } from '@uxcommon/components/alerts/alert-service';
import { createLoadingGate } from '@uxcommon/loading-gate';
import { AbstractAPIService } from '../../../services/api/abstract-api.service';
import { ConfirmDialogService } from '../../../services/shared-dialog.service';
import { DATA_TYPE, PersonsService } from '../services/persons-service';

@Component({
  selector: 'pc-persons-grid',
  imports: [DataGrid, GrainTabs, Icon],
  templateUrl: './persons-grid.html',
  providers: [
    { provide: AbstractAPIService, useExisting: PersonsService },
    provideDataGridConfig({
      messages: {
        exportEntity: 'persons',
        exportFileName: 'persons-export.csv',
        entityNoun: 'person',
        entityNounPlural: 'people',
      },
    }),
  ],
})
export class PersonsGrid implements OnInit {
  private readonly utils = inject(DataGridUtilsService);
  private readonly tagOptionsSvc = inject(TagOptionsService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly dialogs = inject(ConfirmDialogService);
  private readonly alertSvc = inject(AlertService);
  public readonly _loading = createLoadingGate();
  private readonly config = inject(DATA_GRID_CONFIG, { optional: true }) ?? DEFAULT_DATA_GRID_CONFIG;
  private readonly personsService = inject(PersonsService);

  private readonly grid = viewChild<DataGrid<DATA_TYPE, UpdatePersonsType>>('grid');

  public readonly onConfirmDeleteBind = (selected: any[]) => this.confirmDelete(selected);

  public inline = input<boolean>(false);

  private addressChangeModalId: string | null = null;
  private tagOptionValues: string[] = [];
  private issueOptionValues: string[] = [];

  protected col: ColDef[] = [
    {
      // Combined identity column: the door that opens the record. Non-editable and
      // non-hidable; first/last name remain separately editable to its right.
      field: 'name',
      headerName: 'Name',
      editable: false,
      doorColumn: true,
      noHide: true,
      width: 220,
      minWidth: 160,
      valueGetter: (params: CellParams) => {
        const data = params?.data as Record<string, unknown> | undefined;
        if (!data) return '';
        return [data['first_name'], data['last_name']]
          .filter((p) => typeof p === 'string' && p.trim().length)
          .join(' ')
          .trim();
      },
    },
    { field: 'first_name', headerName: 'First Name', editable: true, hide: true },
    { field: 'last_name', headerName: 'Last Name', editable: true, hide: true },
    {
      field: 'address',
      headerName: 'Address',
      editable: false,
      // Not a grow column — a narrow address just wraps to a second line, which reads fine.
      width: 240,
      minWidth: 160,
      onCellClicked: this.onAddressCellClicked.bind(this),
      onCellDoubleClicked: this.confirmOpenEditOnDoubleClick.bind(this),
      isCellInteractive: (row: any) => !row.household_is_placeholder,
      valueGetter: (params: any) => {
        const data = params?.data;
        if (!data) return '';
        const parts: string[] = [];
        const streetParts = [data.apt ? `Apt ${data.apt}` : null, data.street_num, data.street1, data.street2].filter(
          Boolean,
        );
        // Keep the grid cell compact: street + city only. State/zip/country live on the
        // person and household views, not in this at-a-glance column.
        if (streetParts.length) parts.push(streetParts.join(' ').trim());
        if (data.city) parts.push(String(data.city).trim());
        // §2: empty address renders as "—" (the grid cell falls back on ''); an
        // unassigned household is surfaced as a guided empty state on the person view, not here.
        return parts.join(', ').trim();
      },
    },
    // Email grows to fill leftover width when no notes/description column is visible (address
    // is intentionally a fixed, wrapping column). Notes/description still win when shown.
    { field: 'email', headerName: 'Email', editable: true, flex: true, width: 220, minWidth: 180 },
    { field: 'mobile', headerName: 'Mobile', editable: true, width: 140 },
    { field: 'company_name', headerName: 'Company', editable: false, hide: true },
    {
      field: 'home_phone',
      headerName: 'Home phone',
      editable: false,
      hide: true,
      onCellDoubleClicked: this.confirmOpenEditOnDoubleClick.bind(this),
    },
    {
      field: 'tags',
      hide: true,
      headerName: 'Tags',
      editable: true,
      tagColumn: true,
      cellDataType: 'object',
      cellRendererParams: {
        type: 'persons',
        obj: UpdatePersonsObj,
        service: this.personsService,
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
        type: 'persons',
        obj: UpdatePersonsObj,
        service: this.personsService,
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
    {
      field: 'street_num',
      headerName: 'Street Number',
      editable: false,
      hide: true,
      onCellDoubleClicked: this.confirmOpenEditOnDoubleClick.bind(this),
    },
    {
      field: 'apt',
      headerName: 'Apt',
      editable: false,
      hide: true,
      onCellDoubleClicked: this.confirmOpenEditOnDoubleClick.bind(this),
    },
    {
      field: 'street1',
      headerName: 'Street 1',
      editable: false,
      hide: true,
      onCellDoubleClicked: this.confirmOpenEditOnDoubleClick.bind(this),
    },
    {
      field: 'street2',
      headerName: 'Street 2',
      editable: false,
      hide: true,
      onCellDoubleClicked: this.confirmOpenEditOnDoubleClick.bind(this),
    },
    {
      field: 'city',
      headerName: 'City',
      editable: false,
      hide: true,
      onCellDoubleClicked: this.confirmOpenEditOnDoubleClick.bind(this),
    },
    {
      field: 'state',
      headerName: 'State/Province',
      editable: false,
      hide: true,
      onCellDoubleClicked: this.confirmOpenEditOnDoubleClick.bind(this),
    },
    {
      field: 'zip',
      headerName: 'Zip/Province',
      editable: false,
      hide: true,
      onCellDoubleClicked: this.confirmOpenEditOnDoubleClick.bind(this),
    },
    {
      field: 'country',
      headerName: 'Country',
      editable: false,
      hide: true,
      onCellDoubleClicked: this.confirmOpenEditOnDoubleClick.bind(this),
    },
    {
      field: 'notes',
      headerName: 'Notes',
      editable: true,
      cellEditorParams: { textarea: true, rows: 5 },
    },
  ];

  public listId = input<string | null>(null);

  /** Grain total sentence for the header (spec §5): "{n} people total". */
  protected readonly totalSentence = signal<string | null>(null);

  /** Pre-filter the grid from a door link — Tags admin's PEOPLE count (`?tag=`, spec §9.1) and
   * Issues admin's PEOPLE INTERESTED count (`?issue=`, spec §9.2) both land here. Read once on
   * arrival; the grid's own filter chips take over from there (§2 disclosure-over-suppression —
   * the chip shows what's filtering, not a hidden query param). */
  protected readonly initialTagFilter = signal<string[]>([]);
  protected readonly initialIssueFilter = signal<string[]>([]);

  public ngOnInit() {
    // Mute every column except the bold "Name" door, so the door reads as the way in.
    for (const c of this.col) if (!c.doorColumn) c.cellClass = SECONDARY_CELL_CLASS;

    const params = this.route.snapshot.queryParamMap;
    const tag = params.get('tag');
    const issue = params.get('issue');
    if (tag) this.initialTagFilter.set([tag]);
    if (issue) this.initialIssueFilter.set([issue]);

    void this.initializeComponent();
  }

  private async initializeComponent(): Promise<void> {
    try {
      await this.loadTagOptions();
      await this.loadIssueOptions();
      void this.loadTotalCount();
    } catch (error) {
      console.error('Initialization failed', error);
    }
  }

  /**
   * Total people count for the grain header sentence (spec §5): "{n} people total".
   * The All/Donors/Volunteers segmented control was removed per the owner screenshot —
   * donor/volunteer are just tag filters now — so only the overall total is fetched.
   */
  private async loadTotalCount(): Promise<void> {
    try {
      const total = await this.personsService.count();
      this.totalSentence.set(total === 1 ? '1 person total' : `${new Intl.NumberFormat().format(total)} people total`);
    } catch (err) {
      console.error('Failed to load total count', err);
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

  protected getPlusIcon(): PcIconNameType {
    return 'user-plus';
  }

  protected confirmOpenEditOnDoubleClick(event: any) {
    this.addressChangeModalId = event?.data?.household_id ?? event?.household_id;
    this.confirmAddressChange();
  }

  protected onAddressCellClicked(event: any) {
    const householdId = event?.data?.household_id ?? event?.household_id;
    if (householdId) {
      void this.router.navigate(['households', householdId]);
    }
  }

  protected getTitle() {
    return 'People';
  }

  protected getDescription() {
    return 'Manage individual contact records, edit detail fields, track issues/tags, and configure household assignments.';
  }

  // The CSV import wizard (spec §17) replaced the old in-grid import modal —
  // one idiom for the job instead of two. See libs/uxcommon/csv-import for
  // the shared header-mapping heuristic this grid used to own inline.
  protected openImportDialog() {
    void this.router.navigate(['/imports/new']);
  }

  protected routeToHouseholds() {
    const dialog = document.querySelector('#confirmAddressEdit') as HTMLDialogElement;
    dialog.close();

    if (this.addressChangeModalId !== null) {
      void this.router.navigate(['households', this.addressChangeModalId]);
    }
  }

  private confirmAddressChange(): void {
    const dialog = document.querySelector('#confirmAddressEdit') as HTMLDialogElement;
    dialog.showModal();
  }

  protected async confirmDelete(selectedRows?: any[]): Promise<boolean> {
    const selected = selectedRows || this.grid()?.getSelectedRows() || [];
    if (!selected.length) {
      this.alertSvc.showError('No rows selected.');
      return true;
    }

    const ids = selected.map((r: any) => r.id);

    // Show standard delete confirmation
    const selectedCount = selected.length;
    const dynamicMessage = selectedCount
      ? `${selectedCount} row(s) will be deleted permanently. You cannot undo this.`
      : this.config.messages.deleteConfirmMessage;

    const ok = await this.dialogs.confirm({
      title: this.config.messages.deleteConfirmTitle,
      message: dynamicMessage,
      variant: this.config.messages.deleteConfirmVariant,
      icon: this.config.messages.deleteConfirmIcon,
      confirmText: this.config.messages.deleteConfirmText,
      cancelText: this.config.messages.deleteCancelText,
      allowBackdropClose: false,
    });
    if (!ok) return true; // Handled

    const end = this._loading.begin();
    try {
      // Call deleteMany without force, skipping global error toast
      await this.personsService.deleteMany(ids, undefined, true);
      this.alertSvc.showSuccess(this.config.messages.deleteSuccess);
    } catch (err) {
      // Check if it's the captain error message
      const errMsg =
        err instanceof Error && err.message
          ? err.message
          : isRecord(err) &&
              isRecord(err['data']) &&
              typeof err['data']['message'] === 'string' &&
              err['data']['message']
            ? err['data']['message']
            : '';
      if (errMsg.includes('team captains')) {
        // Ask the user if they want to proceed despite being a team captain
        const forceOk = await this.dialogs.confirm({
          title: 'Team Captain Warning',
          message: errMsg,
          variant: 'warning',
          confirmText: 'Yes, delete anyway',
          cancelText: 'Cancel',
        });
        if (forceOk) {
          try {
            await this.personsService.deleteMany(ids, true, true);
            this.alertSvc.showSuccess(this.config.messages.deleteSuccess);
          } catch (forceErr) {
            const forceErrMsg =
              forceErr instanceof Error && forceErr.message
                ? forceErr.message
                : isRecord(forceErr) &&
                    isRecord(forceErr['data']) &&
                    typeof forceErr['data']['message'] === 'string' &&
                    forceErr['data']['message']
                  ? forceErr['data']['message']
                  : 'Delete failed';
            this.alertSvc.showError(forceErrMsg);
          }
        }
      } else {
        this.alertSvc.showError(errMsg || this.config.messages.deleteFailed);
      }
    } finally {
      end();
      this.grid()?.clearAllSelection();
      await this.grid()?.refresh();
    }
    return true;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
