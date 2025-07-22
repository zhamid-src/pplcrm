import { Component, effect, input, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { PERSONINHOUSEHOLDTYPE } from '@common';
import { PersonsService } from './persons-service';
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

  public householdId = input.required<string | null>();

  protected peopleInHousehold: PERSONINHOUSEHOLDTYPE[] = [];

  constructor() {
    // TODO: is effect needed here?
    effect(async () => {
      this.peopleInHousehold = await this.personsSvc.getPeopleInHousehold(this.householdId());
    });
  }
}
