import { Component, effect, input, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { PERSONINHOUSEHOLDTYPE } from '@common';
import { PersonsService } from '@services/backend/persons.service';

@Component({
  selector: 'pc-people-in-household',
  imports: [RouterModule],
  templateUrl: './peopleInHousehold.component.html',
  styleUrl: './peopleInHousehold.component.css',
})
export class PeopleInHouseholdComponent {
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
