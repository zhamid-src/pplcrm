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
        <a routerLink="/people/{{ person.id }}" class="link hover:no-underline">{{ person.full_name }}</a>
      </li>
    }
  </ul>`,
})
export class PeopleInHousehold implements OnInit {
  private personsSvc = inject(PersonsService);

  /** List of people retrieved for the specified household. */
  protected peopleInHousehold = signal<PERSONINHOUSEHOLDTYPE[]>([]);

  /** The ID of the household whose members should be listed. */
  public householdId = input.required<string>();

  constructor() {
    // React to input changes
    effect(async () => {
      const id = this.householdId();
      if (!id) return;

      const list = await this.personsSvc.getPeopleInHousehold(id);
      this.peopleInHousehold.set(list);
    });
  }
  /**
   * Load the list of people for the provided household ID on init.
   */
  public async ngOnInit() {
    // Initial load
    if (this.householdId) {
      const peopleInHouseholds = await this.personsSvc.getPeopleInHousehold(this.householdId());
      this.peopleInHousehold.set(peopleInHouseholds);
    }
  }
}
