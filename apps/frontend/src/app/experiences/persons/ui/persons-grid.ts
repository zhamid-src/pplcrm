import { Component, inject, input, OnInit, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { DataGrid } from '@frontend/shared/components/datagrid/datagrid';
import { TagOptionsService } from '@frontend/shared/components/datagrid/services/tag-options.service';
import { DataGridUtilsService } from '@frontend/shared/components/datagrid/services/utils.service';
import { Icon } from '@icons/icon';
import { PcIconNameType } from '@icons/icons.index';
import { CsvImportComponent, type CsvImportSummary } from '@uxcommon/components/csv-import/csv-import';
import { UpdatePersonsObj, UpdatePersonsType } from '../../../../../../../libs/common/src';

import type { ColumnDef as ColDef } from '@frontend/shared/components/datagrid/grid-defaults';

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

interface ParamsType {
  value: string[];
}

@Component({
  selector: 'pc-persons-grid',
  imports: [DataGrid, Icon, FormsModule, CsvImportComponent],
  templateUrl: './persons-grid.html',
  providers: [
    { provide: AbstractAPIService, useExisting: PersonsService },
    provideDataGridConfig({ messages: { exportEntity: 'persons', exportFileName: 'persons-export.csv' } }),
  ],
})
export class PersonsGrid implements OnInit {
  private readonly utils = inject(DataGridUtilsService);
  private readonly tagOptionsSvc = inject(TagOptionsService);
  private readonly router = inject(Router);
  private readonly dialogs = inject(ConfirmDialogService);
  private readonly alertSvc = inject(AlertService);
  public readonly _loading = createLoadingGate();
  private readonly config = inject(DATA_GRID_CONFIG, { optional: true }) ?? DEFAULT_DATA_GRID_CONFIG;
  private readonly personsService = inject(PersonsService);

  private readonly grid = viewChild<DataGrid<DATA_TYPE, UpdatePersonsType>>('grid');

  public readonly onConfirmDeleteBind = (selected: any[]) => this.confirmDelete(selected);

  public inline = input<boolean>(false);

  private addressChangeModalId: string | null = null;
  private importProgressTimer: any;
  private tagOptionValues: string[] = [];
  private issueOptionValues: string[] = [];

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

  protected col: ColDef[] = [
    { field: 'first_name', headerName: 'First Name', editable: true },
    { field: 'last_name', headerName: 'Last Name', editable: true },
    { field: 'email', headerName: 'Email', editable: true },
    { field: 'mobile', headerName: 'Mobile', editable: true },
    { field: 'company_name', headerName: 'Company', editable: false },
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
      equals: (tagsA: string[], tagsB: string[]) => this.utils.tagArrayEquals(tagsA, tagsB) === 0,
      valueFormatter: (params: ParamsType) => this.utils.tagsToString(params.value),
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
        type: 'persons',
        obj: UpdatePersonsObj,
        service: this.personsService,
        tagType: 'issue',
      },
      cellEditorParams: () => ({ values: this.issueOptionValues, multiple: true }),
      equals: (tagsA: string[], tagsB: string[]) => this.utils.tagArrayEquals(tagsA, tagsB) === 0,
      valueFormatter: (params: ParamsType) => this.utils.tagsToString(params.value),
      comparator: (tagsA: string[], tagsB: string[]) => this.utils.tagArrayEquals(tagsA, tagsB),
    },
    {
      field: 'address',
      headerName: 'Address',
      editable: false,
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
        const locationParts = [data.city, data.state, data.zip, data.country].filter(Boolean);
        if (streetParts.length) parts.push(streetParts.join(' ').trim());
        if (locationParts.length) parts.push(locationParts.join(', ').trim());
        return parts.join(', ').trim() || 'No household assigned';
      },
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

  // Generic CSV importer integration
  protected importerOpen = signal(false);
  protected importSummary = signal<CsvImportSummary | null>(null);

  public listId = input<string | null>(null);

  protected readonly narrowTypeOptions = [
    { label: 'All', value: null, tags: [] },
    { label: 'Volunteers', value: 'volunteer', tags: ['volunteer'] },
    { label: 'Donors', value: 'donor', tags: ['donor'] },
  ];

  protected tagsInput = '';

  public ngOnInit() {
    void this.initializeComponent();
  }

  private async initializeComponent(): Promise<void> {
    try {
      await this.loadTagOptions();
      await this.loadIssueOptions();
      // Any logic that depends on this data should go here
    } catch (error) {
      console.error('Initialization failed', error);
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

  // paging/preview managed by CsvImportComponent

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

  // --- Import CSV Flow ---
  protected openImportDialog() {
    // Clear any prior summary to avoid stale dialogs
    this.importSummary.set(null);
    this.tagsInput = '';
    if (this.importProgressTimer) clearInterval(this.importProgressTimer);
    this.importerOpen.set(true);
  }

  protected routeToHouseholds() {
    const dialog = document.querySelector('#confirmAddressEdit') as HTMLDialogElement;
    dialog.close();

    if (this.addressChangeModalId !== null) {
      void this.router.navigate(['households', this.addressChangeModalId]);
    }
  }

  protected async onImportSubmit(payload: {
    rows: Array<Record<string, string>>;
    skipped: number;
    fileName?: string | null;
  }): Promise<void> {
    const rows = payload?.rows ?? [];
    const skippedReported = Number(payload?.skipped ?? 0) || 0;
    const fileName = (payload?.fileName ?? '').trim();
    const inputTags = this.tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter((t) => !!t);
    const tags = inputTags;

    try {
      const res = await this.personsService.import(rows, tags, skippedReported, fileName || undefined);

      const skipped = typeof res?.skipped === 'number' ? res.skipped : skippedReported;
      const msg = `Import has been queued in the background. You can check its progress on the Imports page. File: ${res?.file_name || fileName}`;

      this.importSummary.set({
        inserted: 0,
        errors: 0,
        skipped,
        queued: true,
        tag: res?.tag ?? undefined,
        failed: false,
        message: msg,
      });
      this.importerOpen.set(false);
      await this.grid()?.refresh();
    } catch (e: any) {
      const msg = e?.message || e?.data?.message || 'Import failed';
      this.importSummary.set({ inserted: 0, errors: 0, skipped: skippedReported, failed: true, message: msg });
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
    } catch (err: any) {
      // Check if it's the captain error message
      const errMsg = err?.message || err?.data?.message || '';
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
          } catch (forceErr: any) {
            const forceErrMsg = forceErr?.message || forceErr?.data?.message || 'Delete failed';
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
