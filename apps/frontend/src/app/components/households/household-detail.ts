import { Component, OnInit, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { PERSONINHOUSEHOLDTYPE, UpdateHouseholdsType } from '@common';
import { AddBtnRow } from '@uxcommon/add-btn-row';
import { AlertService } from '@uxcommon/alert-service';
import { FormInput } from '@uxcommon/formInput';
import { PPlCrmInput } from '@uxcommon/input';
import { TextArea } from '@uxcommon/textarea';

import { PersonsService } from '../persons/persons-service';
import { HouseholdsService } from './households-service';
import { PeopleInHousehold } from 'apps/frontend/src/app/components/persons/people-in-household';
import { Tags } from '@uxcommon/tags/tags';
import { parseAddress } from 'apps/frontend/src/app/utils/googlePlacesAddressMapper';
import { Households } from 'common/src/lib/kysely.models';

/**
 * Component for displaying and managing the details of a household.
 * It supports both creating a new household and editing an existing one.
 */
@Component({
  selector: 'pc-household-detail',
  imports: [FormInput, ReactiveFormsModule, PPlCrmInput, Tags, AddBtnRow, TextArea, PeopleInHousehold],
  templateUrl: './Household-detail.html',
})
export class HouseholdDetail implements OnInit {
  private alertSvc = inject(AlertService);
  private fb = inject(FormBuilder);
  private householdsSvc = inject(HouseholdsService);
  private personsSvc = inject(PersonsService);
  private route = inject(ActivatedRoute);

  /** Reactive signal for storing the loaded household */
  protected _household = signal<Households | null>(null);

  /** Whether the address has been verified via Places API */
  protected addressVerified = false;

  /** List of associated tag strings */
  protected tags: string[] = [];

  /** Reactive form group to handle household data */
  protected form = this.fb.group({
    formatted_address: [''],
    type: [''],
    lat: [0],
    lng: [0],
    street_num: [''],
    street1: [''],
    street2: [''],
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

  /** ID of the household being edited */
  protected id: string | null = null;

  /** List of people linked to the household */
  protected peopleInHousehold: PERSONINHOUSEHOLDTYPE[] = [];

  /** Whether a background operation is in progress */
  protected processing = signal(false);

  /** Component mode: 'edit' or 'new' */
  public mode = input<'new' | 'edit'>('edit');

  constructor() {
    if (this.mode() === 'edit') {
      this.id = this.route.snapshot.paramMap.get('id');
    }
  }

  /** Getter for current household */
  protected get household() {
    return this._household();
  }

  /** Setter for current household */
  protected set household(household: Households | null) {
    this._household.set(household);
  }

  /**
   * Handles address selection and parses Google Places data into form.
   * @param place - Google PlaceResult object from address input
   */
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
   * Lifecycle hook that initializes the component.
   */
  public async ngOnInit() {
    await this.loadHousehold();
  }

  /**
   * Applies an inline edit made in a grid-like interface to the household.
   * @param input - Object containing the changed field and value
   */
  protected async applyEdit(input: { key: string; value: string; changed: boolean }) {
    if (input.changed) {
      const row = { [input.key]: input.value };
      this.update(row);
    }
  }

  /** Returns the creation date of the household */
  protected getCreatedAt() {
    return this.household?.created_at;
  }

  /** Returns the last updated date of the household */
  protected getUpdatedAt() {
    return this.household?.updated_at;
  }

  /**
   * Save the household, calling either update or add depending on mode
   */
  protected save() {
    const data = this.form.getRawValue() as UpdateHouseholdsType;
    return this.id ? this.update(data) : this.add(data);
  }

  /**
   * Called when a tag is added in the UI
   * @param tag - The tag to attach to the household
   */
  protected tagAdded(tag: string) {
    this.id && this.householdsSvc.attachTag(this.id, tag);
  }

  /**
   * Called when a tag is removed in the UI
   * @param tag - The tag to detach from the household
   */
  protected tagRemoved(tag: string) {
    this.id && this.householdsSvc.detachTag(this.id, tag);
  }

  /**
   * Add a new household using the backend service
   * @param data - The household data to submit
   */
  private add(data: UpdateHouseholdsType) {
    this.processing.set(true);
    this.householdsSvc
      .add(data)
      .then(() => this.alertSvc.showSuccess('Household added'))
      .catch((err) => this.alertSvc.showError(err))
      .finally(() => this.processing.set(false));
  }

  /**
   * Loads tags associated with the current household
   */
  private async getTags() {
    if (!this.household || !this.id) {
      return;
    }
    this.tags = await this.householdsSvc.getTags(this.id);
  }

  /**
   * Loads the household data from the backend and initializes the form
   */
  private async loadHousehold() {
    if (!this.id) {
      return;
    }
    this.processing.set(true);

    this.household = (await this.householdsSvc.getById(this.id)) as Households;
    this.getTags();
    this.peopleInHousehold = await this.personsSvc.getPeopleInHousehold(this.id);
    this.refreshForm();

    this.processing.set(false);
  }

  /**
   * Populates the form with household data
   */
  private refreshForm() {
    if (!this.household) {
      return;
    }
    this.form.patchValue(this.household);
  }

  /**
   * Updates an existing household using the backend service
   * @param data - Partial update object for the household
   */
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
