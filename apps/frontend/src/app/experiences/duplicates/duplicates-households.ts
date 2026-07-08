import { Component, inject, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Icon } from '@icons/icon';
import { HouseholdsService } from '@experiences/households/services/households-service';
import { BaseDuplicateManager } from './base-duplicates-manager';
import { DuplicatePageShellComponent, MergeSummaryComponent } from './merge-summary';

@Component({
  selector: 'pc-household-duplicates',
  imports: [DuplicatePageShellComponent, MergeSummaryComponent, Icon, DatePipe],
  templateUrl: './duplicates-households.html',
})
export class HouseholdDuplicatesComponent extends BaseDuplicateManager<any> implements OnInit {
  private householdsSvc = inject(HouseholdsService);

  ngOnInit() {
    void this.loadDuplicates();
  }
  protected getEntityName() {
    return 'household';
  }
  protected fetchFromService(opts: any) {
    return this.householdsSvc.getPotentialDuplicates(opts);
  }
  protected getItemsFromRawGroup(raw: any) {
    return raw.households || [];
  }
  protected mergeInService(targetId: string, sourceId: string) {
    return this.householdsSvc.mergeHouseholds(targetId, sourceId);
  }

  protected getItemDisplayName(hh: any): string {
    const street = [hh.street_num, hh.street1, hh.apt].filter(Boolean).join(' ');
    const city = [hh.city, hh.state].filter(Boolean).join(', ');
    return [street, city].filter(Boolean).join(' in ') || `Household ID: ${hh.id}`;
  }

  public getFullAddress(hh: any): string {
    return (
      [hh.street_num, hh.street1, hh.street2, hh.apt, hh.city, hh.state, hh.zip, hh.country]
        .filter(Boolean)
        .join(', ') || 'No address details'
    );
  }

  public getDisplayNameForId(items: any[], id?: string): string {
    if (!id) return '';
    const item = items.find((i) => i.id === id);
    return item ? this.getItemDisplayName(item) : '';
  }
}
