import { Component, effect, input, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { PERSONINHOUSEHOLDTYPE } from '@common';
import { PersonsService } from './persons-service';

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
export class PeopleInHousehold {
  private personsSvc = inject(PersonsService);

  /** The ID of the household whose members should be listed. */
  public householdId = input.required<string | null>();

  /** List of people retrieved for the specified household. */
  protected peopleInHousehold: PERSONINHOUSEHOLDTYPE[] = [];

  constructor() {
    // TODO:Zee Effect isn't ideal here.  We gotta fix it.
    effect(async () => {
      this.peopleInHousehold = await this.personsSvc.getPeopleInHousehold(this.householdId());
    });
  }
}
