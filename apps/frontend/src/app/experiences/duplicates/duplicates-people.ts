import { Component, inject, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';

import { Icon } from '@icons/icon';
import { PersonsService } from '@experiences/persons/services/persons-service';
import { DuplicatePageShellComponent, MergeSummaryComponent } from './merge-summary';
import { BaseDuplicateManager } from './base-duplicates-manager';

@Component({
  selector: 'pc-people-duplicates',
  imports: [DuplicatePageShellComponent, MergeSummaryComponent, Icon, DatePipe],
  templateUrl: './duplicates-people.html',
})
export class PeopleDuplicatesComponent extends BaseDuplicateManager<any> implements OnInit {
  private personsSvc = inject(PersonsService);

  ngOnInit() {
    this.loadDuplicates();
  }

  protected getEntityName() {
    return 'person';
  }

  protected fetchFromService(opts: any) {
    return this.personsSvc.getPotentialDuplicates(opts);
  }

  protected getItemsFromRawGroup(raw: any) {
    return raw.persons || [];
  }

  protected mergeInService(targetId: string, sourceId: string) {
    return this.personsSvc.mergePersons(targetId, sourceId);
  }

  protected getItemDisplayName(p: any): string {
    return `${p.first_name || ''} ${p.last_name || ''}`.trim();
  }

  // Helper for the template
  public getDisplayNameForId(items: any[], id?: string): string {
    if (!id) return '';
    const item = items.find((i) => i.id === id);
    return item ? this.getItemDisplayName(item) : '';
  }
}
