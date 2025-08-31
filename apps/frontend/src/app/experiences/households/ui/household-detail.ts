/**
 * @file Component for creating or editing households and managing their tags and members.
 */
import { Component, OnInit, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { PERSONINHOUSEHOLDTYPE, UpdateHouseholdsType } from '@common';
import { AddBtnRow } from '@uxcommon/components/add-btn-row/add-btn-row';
import { AlertService } from '@uxcommon/components/alerts/alert-service';
import { Tags } from '@uxcommon/components/tags/tags';
import { createLoadingGate } from '@uxcommon/loading-gate';
import { NgxGpAutocompleteModule, NgxGpAutocompleteOptions } from '@angular-magic/ngx-gp-autocomplete';

import { PersonsService } from '../../persons/services/persons-service';
import { PeopleInHousehold } from '../../persons/ui/people-in-household';
import { HouseholdsService } from '../services/households-service';
import { parseAddress } from 'apps/frontend/src/app/utils/googlePlacesAddressMapper';
import { Households } from 'common/src/lib/kysely.models';

/**
 * Component for displaying and managing the details of a household.
 * It supports both creating a new household and editing an existing one.
 */
@Component({
  selector: 'pc-household-detail',
  imports: [ReactiveFormsModule, NgxGpAutocompleteModule, Tags, AddBtnRow, PeopleInHousehold],
  templateUrl: './household-detail.html',
})
export class HouseholdDetail implements OnInit {
  private readonly alertSvc = inject(AlertService);
  private readonly fb = inject(FormBuilder);
  private readonly householdsSvc = inject(HouseholdsService);
  private readonly personsSvc = inject(PersonsService);
  private readonly route = inject(ActivatedRoute);

  /** Whether a background operation is in progress */
  private _loading = createLoadingGate();

  /** Reactive signal for storing the loaded household */
  protected readonly household = signal<Households | null>(null);

  /** Whether the address has been verified via Places API */
  protected addressVerified = false;

  /** List of associated tag strings */
  protected tags: string[] = [];

  /** Options for Google Places autocomplete (Canada, geocode) */
  protected options: NgxGpAutocompleteOptions = {
    componentRestrictions: { country: ['CA'] },
    types: ['geocode'],
  };

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
  protected isLoading = this._loading.visible;

  /** List of people linked to the household */
  protected peopleInHousehold: PERSONINHOUSEHOLDTYPE[] = [];

  /** Component mode: 'edit' or 'new' */
  public mode = input<'new' | 'edit'>('edit');

  /**
   * Initializes the component and captures the household ID in edit mode.
   */
  constructor() {
    if (this.mode() === 'edit') {
      this.id = this.route.snapshot.paramMap.get('id');
    }
  }

  /**
   * Handles address selection and parses Google Places data into form.
   * @param place - Google PlaceResult object from address input
   */
  public handleAddressChange(place: google.maps.places.PlaceResult) {
    const end = this._loading.begin();
    try {
      if (!place?.address_components?.length) {
        this.alertSvc.showError('Please select the correct address from the list or leave it blank');
        return;
      }
      // Save the address by creating the household or updating
      const address = parseAddress(place);
      this.form.patchValue(address);
      this.form.markAsDirty();
      this.addressVerified = true;
    } finally {
      end();
    }
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
    return this.household()?.created_at;
  }

  /** Returns the last updated date of the household */
  protected getUpdatedAt() {
    return this.household()?.updated_at;
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
    const end = this._loading.begin();
    this.householdsSvc
      .add(data)
      .then(() => this.alertSvc.showSuccess('Household added'))
      .catch((err: unknown) => this.alertSvc.showError(String(err)))
      .finally(() => end());
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
    if (!this.id) return;

    const end = this._loading.begin();

    try {
      this.household.set((await this.householdsSvc.getById(this.id)) as Households);
      await this.getTags();
      this.peopleInHousehold = await this.personsSvc.getPeopleInHousehold(this.id);
      this.refreshForm();
    } finally {
      end();
    }
  }

  /**
   * Populates the form with household data
   */
  private refreshForm() {
    const household = this.household();
    if (!household) return;

    this.form.patchValue(household);
  }

  /**
   * Updates an existing household using the backend service
   * @param data - Partial update object for the household
   */
  private update(data: Partial<UpdateHouseholdsType>) {
    if (!this.id) {
      return;
    }

    const end = this._loading.begin();
    this.householdsSvc
      .update(this.id, data)
      .then(() => {
        this.alertSvc.showSuccess('Household updated successfully.');
        this.form.markAsPristine();
      })
      .catch((err: unknown) => this.alertSvc.showError(String(err)))
      .finally(() => end());
  }
}
