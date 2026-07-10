import { Component, signal, inject, viewChild } from '@angular/core';
import { Router } from '@angular/router';
import { DataGrid } from '@frontend/shared/components/datagrid/datagrid';
import { SECONDARY_CELL_CLASS } from '@frontend/shared/components/datagrid/grid-defaults';
import type { CellParams, ColumnDef as ColDef } from '@frontend/shared/components/datagrid/grid-defaults';
import { GrainTabs } from '@frontend/shared/components/grain-tabs/grain-tabs';
import { AbstractAPIService } from '../../../services/api/abstract-api.service';
import { provideDataGridConfig } from '@frontend/shared/components/datagrid/datagrid.tokens';
import { PersonsService } from '../../persons/services/persons-service';
import { CompaniesService } from '../services/companies-service';

@Component({
  selector: 'pc-companies-grid',
  imports: [DataGrid, GrainTabs],
  host: { class: 'block h-full' },
  template: `
    <div class="flex h-full min-h-0 flex-col gap-6">
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
        (importCSV)="openImportWizard()"
        (rowsDeleted)="onRowsDeleted()"
        plusIcon="add-company"
        i18n-plusIcon
      >
        <div pcGridBelowHeader>
          <pc-grain-tabs />
        </div>
      </pc-datagrid>
    </div>
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
  private readonly router = inject(Router);

  /** Grain total sentence for the header (spec §5): "{n} people in {m} companies". */
  protected readonly totalSentence = signal<string | null>(null);

  private readonly grainTabs = viewChild(GrainTabs);

  /** Deletes change the header counts — re-query the grain sentence and tab totals. */
  protected onRowsDeleted(): void {
    void this.loadGrainSentence();
    this.grainTabs()?.reloadCounts();
  }

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

  // The CSV import wizard (spec §17) replaced the old in-grid import modal —
  // one idiom for the job across every record type.
  protected openImportWizard(): void {
    void this.router.navigate(['/imports/new'], { queryParams: { type: 'companies' } });
  }
}
