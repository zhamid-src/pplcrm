import { Component, signal, inject, viewChild } from '@angular/core';
import { DataGrid } from '@frontend/shared/components/datagrid/datagrid';
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
    provideDataGridConfig({ messages: { exportEntity: 'companies', exportFileName: 'companies-export.csv' } }),
  ],
})
export class CompaniesGrid {
  private readonly companiesService = inject(CompaniesService);
  private readonly personsService = inject(PersonsService);
  private readonly grid = viewChild<DataGrid<'companies', any>>('grid');

  private readonly dateFormatter = new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  protected readonly mappableFields = ['name', 'description', 'website', 'email', 'phone', 'industry', 'notes'];
  protected readonly importerOpen = signal(false);
  protected readonly importSummary = signal<CsvImportSummary | null>(null);

  /** Grain total sentence for the header (spec §5): "{n} people in {m} companies". */
  protected readonly totalSentence = signal<string | null>(null);

  constructor() {
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

  protected col = [
    { field: 'name', headerName: 'Company Name', editable: true },
    { field: 'website', headerName: 'Website', editable: true },
    { field: 'industry', headerName: 'Industry', editable: true },
    { field: 'email', headerName: 'Email', editable: true },
    { field: 'phone', headerName: 'Phone', editable: true },
    { field: 'description', headerName: 'Description', editable: true },
    {
      field: 'created_at',
      headerName: 'Created',
      valueFormatter: (p: any) => this.formatDate(p.value ?? p.data?.created_at),
    },
  ];

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

  private formatDate(value: unknown): string {
    if (!value) return '';
    const date = value instanceof Date ? value : new Date(value as string);
    if (Number.isNaN(date.getTime())) return '';
    return this.dateFormatter.format(date);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
