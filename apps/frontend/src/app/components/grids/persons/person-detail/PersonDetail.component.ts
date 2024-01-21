import { CommonModule } from '@angular/common';
import { Component, Input, OnInit, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { UpdatePersonsType } from '@common';
import { AlertService } from '@services/alert.service';
import { PersonsBackendService } from '@services/backend/persons.service';
import { AddBtnRowComponent } from '@uxcommon/add-btn-row/AddBtnRow.component';
import { FormInputComponent } from '@uxcommon/form-input/formInput.component';
import { InputComponent } from '@uxcommon/input/input.component';
import { TagsComponent } from '@uxcommon/tags/tags.component';
import { TextareaComponent } from '@uxcommon/textarea/textarea.component';
import { parseAddress } from 'apps/frontend/src/app/utils/googlePlacesAddressMapper';
import { Persons } from 'common/src/lib/kysely.models';

@Component({
  selector: 'pc-person-detail',
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
  ],
  templateUrl: './PersonDetail.component.html',
  styleUrl: './PersonDetail.component.scss',
})
export class PersonDetailComponent implements OnInit {
  @Input() public mode: 'new' | 'edit' = 'edit';

  protected addressVerified = false;
  protected form = this.fb.group({
    first_name: [''],
    middle_names: [''],
    last_name: [''],
    email: [''],
    email2: [''],
    home_phone: [''],
    mobile: [''],
    notes: [''],
    address: this.fb.group({
      formatted_address: [''],
      type: [''],
      lat: [''],
      lng: [''],
      street_num: [''],
      street: [''],
      city: [''],
      state: [''],
      country: [''],
      zip: [''],
    }),
    metadata: this.fb.group({
      tenant_id: [''],
      createdby_id: [''],
      updatedby_id: [''],
      created_at: [''],
      updated_at: [''],
    }),
    tags: [[]],
  });
  protected id: string | null = null;
  protected person: Persons | undefined;
  protected processing = signal(false);
  protected tags: string[] = [];

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private persons: PersonsBackendService,
    private alertSvc: AlertService,
  ) {
    if (this.mode === 'edit') {
      this.id = this.route.snapshot.paramMap.get('id');
    }
  }

  public async ngOnInit() {
    await this.loadPerson();
  }

  public save() {
    return this.id ? this.update() : this.add();
  }

  private update() {
    if (!this.id) {
      return;
    }
    const data = this.form.getRawValue() as UpdatePersonsType;

    this.processing.set(true);
    this.persons
      .update(this.id, data)
      .then(() => this.alertSvc.showSuccess('Person updated'))
      .catch((err) => this.alertSvc.showError(err))
      .finally(() => this.processing.set(false));
  }
  private add() {
    const data = this.form.getRawValue() as UpdatePersonsType;

    this.processing.set(true);
    this.persons
      .add(data)
      .then(() => this.alertSvc.showSuccess('Person added'))
      .catch((err) => this.alertSvc.showError(err))
      .finally(() => this.processing.set(false));
  }

  public handleAddressChange(place: google.maps.places.PlaceResult) {
    this.processing.set(true);
    if (!place?.address_components?.length) {
      this.alertSvc.showError('Please select the correct address from the list or leave it blank');
      return;
    }
    // Save the address by creating the household or updating
    const address = parseAddress(place);
    this.addressVerified = true;
    console.log(address);
    this.processing.set(false);
  }

  private async loadPerson() {
    if (!this.id) {
      return;
    }
    this.processing.set(true);

    this.person = (await this.persons.getById(this.id!)) as Persons;
    console.log(this.person);
    this.refreshForm();

    this.processing.set(false);
  }

  private refreshForm() {
    if (!this.person) {
      return;
    }
    this.form.patchValue(this.person);
  }

  protected getCreatedAt() {
    return this.person?.created_at;
  }
  protected getUpdatedAt() {
    return this.person?.updated_at;
  }

  protected getFormName() {
    return `${this.form.get('first_name')?.value} ${this.form.get('middle_names')
      ?.value}  ${this.form.get('last_name')?.value}`;
  }
}
