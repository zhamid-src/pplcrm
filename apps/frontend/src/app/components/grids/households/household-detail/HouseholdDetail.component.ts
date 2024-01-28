import { CommonModule } from '@angular/common';
import { Component, Input, OnInit, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { PERSONINHOUSEHOLDTYPE, UpdateHouseholdsType } from '@common';
import { AlertService } from '@services/alert.service';
import { HouseholdsService } from '@services/backend/households.service';
import { PersonsService } from '@services/backend/persons.service';
import { AddBtnRowComponent } from '@uxcommon/add-btn-row/AddBtnRow.component';
import { FormInputComponent } from '@uxcommon/form-input/formInput.component';
import { InputComponent } from '@uxcommon/input/input.component';
import { PeopleInHouseholdComponent } from '@uxcommon/ppl-in-household/peopleInHousehold.component';
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
    PeopleInHouseholdComponent,
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
  protected _household = signal<Households | null>(null);
  protected get household() {
    return this._household();
  }
  protected set household(household: Households | null) {
    this._household.set(household);
  }
  protected id: string | null = null;
  protected peopleInHousehold: PERSONINHOUSEHOLDTYPE[] = [];
  protected processing = signal(false);
  protected tags: string[] = [];

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private householdsSvc: HouseholdsService,
    private personsSvc: PersonsService,
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
    this.form.markAsDirty();
    this.addressVerified = true;
    console.log(address);
    this.processing.set(false);
  }

  /**
   * Apply the edits the user did on the grid. This is done by calling the
   * backend service to update the row in the database.
   *
   * @param id
   * @param data
   * @returns Boolean indicating whether the edit was successful or not
   */
  protected async applyEdit(input: { key: string; value: string; changed: boolean }) {
    if (input.changed) {
      const row = { [input.key]: input.value };
      this.update(row);
    }
  }

  protected getCreatedAt() {
    return this.household?.created_at;
  }

  protected getUpdatedAt() {
    return this.household?.updated_at;
  }

  protected save() {
    const data = this.form.getRawValue() as UpdateHouseholdsType;
    return this.id ? this.update(data) : this.add(data);
  }

  protected tagAdded(tag: string) {
    this.householdsSvc.attachTag(this.id!, tag);
  }

  protected tagRemoved(tag: string) {
    this.householdsSvc.detachTag(this.id!, tag);
  }

  private add(data: UpdateHouseholdsType) {
    this.processing.set(true);
    this.householdsSvc
      .add(data)
      .then(() => this.alertSvc.showSuccess('Household added'))
      .catch((err) => this.alertSvc.showError(err))
      .finally(() => this.processing.set(false));
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
    this.getTags();
    this.peopleInHousehold = await this.personsSvc.getPeopleInHousehold(this.id);
    this.refreshForm();

    this.processing.set(false);
  }

  private refreshForm() {
    if (!this.household) {
      return;
    }
    this.form.patchValue(this.household);
  }

  private update(data: Partial<UpdateHouseholdsType>) {
    if (!this.id) {
      return;
    }

    this.processing.set(true);
    this.householdsSvc
      .update(this.id, data)
      .then(() => {
        this.alertSvc.showSuccess('Household updated successfully.');
        this.form.markAsPristine();
      })
      .catch((err) => this.alertSvc.showError(err))
      .finally(() => this.processing.set(false));
  }
}
