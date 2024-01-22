import { CommonModule } from '@angular/common';
import { Component, Input, OnInit, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { AlertService } from '@services/alert.service';
import { HouseholdsBackendService } from '@services/backend/households.service';
import { PersonsBackendService } from '@services/backend/persons.service';
import { AddBtnRowComponent } from '@uxcommon/add-btn-row/AddBtnRow.component';
import { FormInputComponent } from '@uxcommon/form-input/formInput.component';
import { InputComponent } from '@uxcommon/input/input.component';
import { TagsComponent } from '@uxcommon/tags/tags.component';
import { TextareaComponent } from '@uxcommon/textarea/textarea.component';
import { parseAddress } from 'apps/frontend/src/app/utils/googlePlacesAddressMapper';
import { Households } from 'common/src/lib/kysely.models';

@Component({
  selector: 'pc-household-detail',
  standalone: true,
  imports: [
    CommonModule,
    FormInputComponent,
    FormsModule,
    ReactiveFormsModule,
    InputComponent,
    TagsComponent,
    AddBtnRowComponent,
    TextareaComponent,
    RouterModule,
  ],
  templateUrl: './HouseholdDetail.component.html',
  styleUrl: './HouseholdDetail.component.scss',
})
export class HouseholdDetailComponent implements OnInit {
  @Input() public mode: 'new' | 'edit' = 'edit';

  protected addressVerified = false;
  protected form = this.fb.group({
    formatted_address: [''],
    type: [''],
    lat: [0],
    lng: [0],
    street_num: [''],
    street: [''],
    apt: [''],
    city: [''],
    state: [''],
    country: [''],
    zip: [''],
    home_phone: [''],
    notes: [''],
    tags: [],
    metadata: this.fb.group({
      tenant_id: [''],
      createdby_id: [''],
      updatedby_id: [''],
      created_at: [''],
      updated_at: [''],
    }),
  });
  protected household: Households | undefined;
  protected id: string | null = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected peopleInHousehold: any[] = [];
  protected processing = signal(false);
  protected tags: string[] = [];

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private householdsSvc: HouseholdsBackendService,
    private personsSvc: PersonsBackendService,
    private alertSvc: AlertService,
  ) {
    if (this.mode === 'edit') {
      this.id = this.route.snapshot.paramMap.get('id');
    }
  }

  public async ngOnInit() {
    await this.loadHousehold();
  }

  public handleAddressChange(place: google.maps.places.PlaceResult) {
    this.processing.set(true);
    if (!place?.address_components?.length) {
      this.alertSvc.showError('Please select the correct address from the list or leave it blank');
      return;
    }
    // Save the address by creating the household or updating
    const address = parseAddress(place);
    this.form.patchValue(address);
    this.addressVerified = true;
    console.log(address);
    this.processing.set(false);
  }

  protected getCreatedAt() {
    return this.household?.created_at;
  }

  protected getUpdatedAt() {
    return this.household?.updated_at;
  }

  protected save() {}

  private async getPeopleInHousehold() {
    if (!this.household) {
      return;
    }
    this.peopleInHousehold = await this.personsSvc.getByHouseholdId(this.id!, {
      columns: ['id', 'first_name', 'middle_names', 'last_name'],
    });
    [
      {
        id: '229',
        first_name: 'Jessica',
        middle_names: 'J',
        last_name: 'Taylor',
      },
      {
        id: '239',
        first_name: 'Christopher',
        middle_names: 'V',
        last_name: 'White',
      },
      {
        id: '248',
        first_name: 'Mia',
        middle_names: 'M',
        last_name: 'Hernandez',
      },
    ];
    this.peopleInHousehold = this.peopleInHousehold.map((person) => {
      return {
        ...person,
        full_name: `${person.first_name} ${person.middle_names} ${person.last_name}`,
      };
    });
    console.log(this.peopleInHousehold);
  }

  private async getTags() {
    if (!this.household) {
      return;
    }
    this.tags = await this.householdsSvc.getTags(this.id!);
    console.log(this.tags);
  }

  private async loadHousehold() {
    if (!this.id) {
      return;
    }
    this.processing.set(true);

    this.household = (await this.householdsSvc.getById(this.id!)) as Households;
    console.log(this.household);
    this.getTags();
    this.getPeopleInHousehold();
    this.refreshForm();

    this.processing.set(false);
  }

  private refreshForm() {
    if (!this.household) {
      return;
    }
    this.form.patchValue(this.household);
  }
}
