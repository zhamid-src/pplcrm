import { CommonModule } from '@angular/common';
import { Component, effect, input } from '@angular/core';
import { RouterModule } from '@angular/router';
import { PERSONINHOUSEHOLDTYPE } from '@common';
import { PersonsService } from '@services/backend/persons.service';

@Component({
  selector: 'pc-people-in-household',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './peopleInHousehold.component.html',
  styleUrl: './peopleInHousehold.component.scss',
})
export class PeopleInHouseholdComponent {
  public householdId = input.required<string | null>();

  protected peopleInHousehold: PERSONINHOUSEHOLDTYPE[] = [];

  constructor(private personsSvc: PersonsService) {
    // TODO: is effect needed here?
    effect(async () => {
      this.peopleInHousehold = await this.personsSvc.getPeopleInHousehold(this.householdId());
    });
  }
}
