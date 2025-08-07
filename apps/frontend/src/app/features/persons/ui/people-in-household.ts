import { Component, OnInit, inject, input } from '@angular/core';
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
    @for (person of peopleInHousehold; track person) {
      <li>
        <a routerLink="/console/people/{{ person.id }}" class="link hover:no-underline">{{ person.full_name }}</a>
      </li>
    }
  </ul>`,
})
export class PeopleInHousehold implements OnInit {
  private personsSvc = inject(PersonsService);

  /** List of people retrieved for the specified household. */
  protected peopleInHousehold: PERSONINHOUSEHOLDTYPE[] = [];

  /** The ID of the household whose members should be listed. */
  public householdId = input.required<string | null>();

  public async ngOnInit() {
    this.peopleInHousehold = await this.personsSvc.getPeopleInHousehold(this.householdId());
  }
}
