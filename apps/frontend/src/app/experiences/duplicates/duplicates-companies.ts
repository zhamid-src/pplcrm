import { Component, inject, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';

import { Icon } from '@icons/icon';
import { CompaniesService } from '@experiences/companies/services/companies-service';
import { BaseDuplicateManager } from './base-duplicates-manager';
import { DuplicatePageShellComponent, MergeSummaryComponent } from './merge-summary';

@Component({
  selector: 'pc-company-duplicates',
  imports: [DuplicatePageShellComponent, MergeSummaryComponent, Icon, DatePipe],
  templateUrl: './duplicates-companies.html',
})
export class CompanyDuplicatesComponent extends BaseDuplicateManager<any> implements OnInit {
  private companiesSvc = inject(CompaniesService);

  ngOnInit() {
    this.loadDuplicates();
  }
  protected getEntityName() {
    return 'company';
  }
  protected fetchFromService(opts: any) {
    return this.companiesSvc.getPotentialDuplicates(opts);
  }
  protected getItemsFromRawGroup(raw: any) {
    return raw.companies || [];
  }
  protected mergeInService(targetId: string, sourceId: string) {
    return this.companiesSvc.mergeCompanies(targetId, sourceId);
  }

  protected getItemDisplayName(c: any): string {
    return c.name;
  }

  public getDisplayNameForId(items: any[], id?: string): string {
    if (!id) return '';
    const item = items.find((i) => i.id === id);
    return item ? this.getItemDisplayName(item) : '';
  }
}
