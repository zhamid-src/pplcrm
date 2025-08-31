/**
 * @file Component for displaying people associated with a household.
 */
import { Component, OnInit, effect, inject, input, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { PERSONINHOUSEHOLDTYPE } from '@common';

import { PersonsService } from '../services/persons-service';

/**
 * Component used to render a list of people belonging to a given household.
 * Each person is shown as a link to their detail page.
 */
@Component({
  selector: 'pc-people-in-household',
  imports: [RouterModule],
  template: `<ul>
    @for (person of peopleInHousehold(); track person.id) {
      <li>
        <a routerLink="/console/people/{{ person.id }}" class="link hover:no-underline">{{ person.full_name }}</a>
      </li>
    }
  </ul>`,
})
export class PeopleInHousehold implements OnInit {
  private personsSvc = inject(PersonsService);

  /** List of people retrieved for the specified household. */
  protected peopleInHousehold = signal<PERSONINHOUSEHOLDTYPE[]>([]);

  /** Optional person ID to exclude from the list (e.g., current person). */
  public excludePersonId = input<string | null>(null);

  /** The ID of the household whose members should be listed. */
  public householdId = input.required<string>();

  constructor() {
    // React to input changes
    effect(async () => {
      const id = this.householdId();
      const excludeId = this.excludePersonId();
      if (!id) return;

      const list = await this.personsSvc.getPeopleInHousehold(id);
      const filtered = excludeId ? list.filter((p) => p.id !== excludeId) : list;
      this.peopleInHousehold.set(filtered);
    });
  }

  /**
   * Load the list of people for the provided household ID on init.
   */
  public async ngOnInit() {
    // Initial load
    if (this.householdId) {
      const excludeId = this.excludePersonId();
      const peopleInHouseholds = await this.personsSvc.getPeopleInHousehold(this.householdId());
      const filtered = excludeId ? peopleInHouseholds.filter((p) => p.id !== excludeId) : peopleInHouseholds;
      this.peopleInHousehold.set(filtered);
    }
  }
}
