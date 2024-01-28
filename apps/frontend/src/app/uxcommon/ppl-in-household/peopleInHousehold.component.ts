import { CommonModule } from '@angular/common';
import { Component, Input, OnInit } from '@angular/core';
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
export class PeopleInHouseholdComponent implements OnInit {
  @Input({ required: true }) public householdId: string | null | undefined;

  protected peopleInHousehold: PERSONINHOUSEHOLDTYPE[] = [];
  constructor(private personsSvc: PersonsService) {}

  async ngOnInit() {
    this.peopleInHousehold = await this.personsSvc.getPeopleInHousehold(this.householdId);
  }
}
