import { Component, signal, inject, viewChild } from '@angular/core';
import { DataGrid } from '@frontend/shared/components/datagrid/datagrid';
import { SECONDARY_CELL_CLASS } from '@frontend/shared/components/datagrid/grid-defaults';
import type { CellParams, ColumnDef as ColDef } from '@frontend/shared/components/datagrid/grid-defaults';
import { GrainTabs } from '@frontend/shared/components/grain-tabs/grain-tabs';
import { CsvImportComponent, type CsvImportSummary } from '@uxcommon/components/csv-import/csv-import';
import { AbstractAPIService } from '../../../services/api/abstract-api.service';
import { provideDataGridConfig } from '@frontend/shared/components/datagrid/datagrid.tokens';
import { PersonsService } from '../../persons/services/persons-service';
import { CompaniesService } from '../services/companies-service';

@Component({
  selector: 'pc-companies-grid',
  imports: [DataGrid, GrainTabs, CsvImportComponent],
  template: `
    <div class="flex flex-col gap-6">
      <pc-datagrid
        #grid
        [grainLayout]="true"
        [fitColumns]="true"
        title="Companies"
        i18n-title
        description="Manage corporate contacts, associate people with companies, and track organization profiles."
        i18n-description
        [colDefs]="col"
        [disableDelete]="false"
        [disableMerge]="false"
        [disableView]="false"
        [disableExport]="true"
        [disableImport]="false"
        [allowFilter]="false"
        [addRoute]="'add'"
        [totalSentence]="totalSentence()"
        (importCSV)="openImportDialog()"
        plusIcon="add-company"
        i18n-plusIcon
      >
        <div pcGridBelowHeader>
          <pc-grain-tabs />
        </div>
      </pc-datagrid>
    </div>

    <pc-csv-importer
      [open]="importerOpen()"
      [title]="'Import Companies from CSV'"
      [mappableFields]="mappableFields"
      [autoMapHeader]="autoMapHeader"
      [summary]="importSummary()"
      (submit)="onImportSubmit($event)"
      (close)="importerOpen.set(false); importSummary.set(null)"
      (closeSummary)="importSummary.set(null)"
    />
  `,
  providers: [
    { provide: AbstractAPIService, useExisting: CompaniesService },
    provideDataGridConfig({
      messages: {
        entityNoun: 'company',
        entityNounPlural: 'companies',
        exportEntity: 'companies',
        exportFileName: 'companies-export.csv',
      },
    }),
  ],
})
export class CompaniesGrid {
  private readonly companiesService = inject(CompaniesService);
  private readonly personsService = inject(PersonsService);
  private readonly grid = viewChild<DataGrid<'companies', any>>('grid');

  protected readonly mappableFields = ['name', 'description', 'website', 'email', 'phone', 'industry', 'notes'];
  protected readonly importerOpen = signal(false);
  protected readonly importSummary = signal<CsvImportSummary | null>(null);

  /** Grain total sentence for the header (spec §5): "{n} people in {m} companies". */
  protected readonly totalSentence = signal<string | null>(null);

  constructor() {
    // Mute every column except the bold "Company Name" door, so the door reads as the way in.
    for (const c of this.col) if (!c.doorColumn) c.cellClass = SECONDARY_CELL_CLASS;

    void this.loadGrainSentence();
  }

  private async loadGrainSentence(): Promise<void> {
    try {
      const [people, companies] = await Promise.all([
        this.personsService.countWithCompany(),
        this.companiesService.count(),
      ]);
      const fmt = new Intl.NumberFormat();
      const peopleText = people === 1 ? '1 person' : `${fmt.format(people)} people`;
      const companiesText = companies === 1 ? '1 company' : `${fmt.format(companies)} companies`;
      this.totalSentence.set(`${peopleText} in ${companiesText}`);
    } catch (err) {
      console.error('Failed to load company grain counts', err);
    }
  }

  protected col: ColDef[] = [
    {
      // The door that opens the company record. Non-editable and non-hidable identity column.
      field: 'name',
      headerName: 'Company Name',
      editable: false,
      doorColumn: true,
      noHide: true,
      width: 240,
      minWidth: 180,
    },
    {
      // Employee count from persons.company_id (§7). Plain, non-interactive text — only
      // the Company Name column is the door.
      field: 'persons_count',
      headerName: 'People',
      editable: false,
      width: 110,
      minWidth: 90,
      valueFormatter: (params: CellParams) => this.formatPeopleCount(params),
    },
    { field: 'website', headerName: 'Website', editable: true, width: 240 },
    { field: 'description', headerName: 'Description', editable: true, width: 360, minWidth: 200 },
  ];

  /** Formats the employee count as "N people" (singular/plural). */
  private formatPeopleCount(params: CellParams): string {
    const n = Number((params.data as Record<string, unknown> | undefined)?.['persons_count'] ?? 0);
    return `${n} ${n === 1 ? 'person' : 'people'}`;
  }

  protected openImportDialog() {
    this.importSummary.set(null);
    this.importerOpen.set(true);
  }

  protected readonly autoMapHeader = (h: string): string => {
    const raw = (h || '').toLowerCase().trim();
    const key = raw.replace(/[^a-z0-9]/g, '');
    const map: Record<string, string> = {
      name: 'name',
      companyname: 'name',
      description: 'description',
      desc: 'description',
      website: 'website',
      web: 'website',
      email: 'email',
      phone: 'phone',
      tel: 'phone',
      telephone: 'phone',
      industry: 'industry',
      notes: 'notes',
      note: 'notes',
    };
    return map[key] || '';
  };

  protected async onImportSubmit(payload: {
    rows: Array<Record<string, string>>;
    skipped: number;
    fileName?: string | null;
  }): Promise<void> {
    const rows = payload?.rows ?? [];
    const skippedReported = Number(payload?.skipped ?? 0) || 0;
    const fileName = (payload?.fileName ?? '').trim();

    try {
      const res = await this.companiesService.import(rows, skippedReported, fileName || undefined);

      const skipped = typeof res?.skipped === 'number' ? res.skipped : skippedReported;
      const msg = `Import has been queued in the background. You can check its progress on the Imports page. File: ${res?.file_name || fileName}`;

      this.importSummary.set({
        inserted: 0,
        errors: 0,
        skipped,
        queued: true,
        failed: false,
        message: msg,
      });
      this.importerOpen.set(false);
      await this.grid()?.refresh();
    } catch (e) {
      const msg =
        e instanceof Error && e.message
          ? e.message
          : isRecord(e) && isRecord(e['data']) && typeof e['data']['message'] === 'string' && e['data']['message']
            ? e['data']['message']
            : 'Import failed';
      this.importSummary.set({ inserted: 0, errors: 0, skipped: skippedReported, failed: true, message: msg });
      this.importerOpen.set(false);
    }
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
