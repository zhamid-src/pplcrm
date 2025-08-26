/**
 * @file Component for creating or updating individual person records.
 */
import { Component, OnInit, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { UpdatePersonsType } from '@common';
import { AddBtnRow } from '@uxcommon/components/add-btn-row/add-btn-row';
import { AlertService } from '@uxcommon/components/alerts/alert-service';
import { FormInput } from '@uxcommon/components/form-input/formInput';
import { Tags } from '@uxcommon/components/tags/tags';
import { TextArea } from '@uxcommon/components/textarea/textarea';

import { HouseholdsService } from '../../households/services/households-service';
import { PersonsService } from '../services/persons-service';
import { PeopleInHousehold } from './people-in-household';
import { AddressType, Persons } from 'common/src/lib/kysely.models';

/**
 * Component for displaying and editing a single person's details.
 * Handles both "new" (creation) and "edit" (update) modes.
 */
@Component({
  selector: 'pc-person-detail',
  imports: [FormInput, ReactiveFormsModule, Tags, AddBtnRow, TextArea, RouterModule, PeopleInHousehold],
  templateUrl: './person-detail.html',
})
export class PersonDetail implements OnInit {
  private readonly alertSvc = inject(AlertService);
  private readonly fb = inject(FormBuilder);
  private readonly householdsSvc = inject(HouseholdsService);
  private readonly personsSvc = inject(PersonsService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly addressString = signal<string | null>(null);
  protected readonly loading = signal(false);
  protected readonly person = signal<Persons | null>(null);

  /** Reactive form group for person data */
  protected form = this.fb.group({
    first_name: [''],
    middle_names: [''],
    last_name: [''],
    email: [''],
    email2: [''],
    home_phone: [''],
    mobile: [''],
    notes: [''],
    metadata: this.fb.group({
      tenant_id: [''],
      createdby_id: [''],
      updatedby_id: [''],
      created_at: [''],
      updated_at: [''],
    }),
  });

  /** ID of the person being edited (if in edit mode) */
  protected id: string | null = null;
  protected tags = signal<string[]>([]);

  /** Determines if this component is in 'edit' or 'new' mode */
  public mode = input<'new' | 'edit'>('edit');

  /**
   * Initializes the component and determines edit mode via route params.
   */
  constructor() {
    if (this.mode() === 'edit') {
      this.id = this.route.snapshot.paramMap.get('id');
    }
  }

  /** Lifecycle hook to initialize the component and load person data */
  public ngOnInit() {
    this.loadPerson();
  }

  /**
   * Save the person details to backend.
   * If in edit mode, it updates the person; otherwise, it creates a new entry.
   */
  public save() {
    const data = this.form.getRawValue() as UpdatePersonsType;
    return this.id ? this.update(data) : this.add(data);
  }

  /**
   * Apply the edits the user did on the grid. This is done by calling the
   * backend service to update the row in the database.
   *
   * @param input - Key-value pair representing the changed field and its new value
   */
  protected async applyEdit(input: { key: string; value: string; changed: boolean }) {
    if (input.changed) {
      const row = { [input.key]: input.value };
      this.update(row);
    }
  }

  /**
   * Fetch and set a formatted address string for the person if they belong to a household.
   */
  protected async getAddressString() {
    const household_id = this.person()?.household_id;
    if (household_id) {
      const address = (await this.householdsSvc.getById(household_id)) as AddressType;
      this.addressString.set(this.getFormattedAddress(address));
    }
  }

  /** Returns the creation date of the person */
  protected getCreatedAt() {
    return this.person()?.created_at;
  }

  /** Returns the full name of the person constructed from form inputs */
  protected getFormName() {
    return `${this.form.get('first_name')?.value} ${this.form.get('middle_names')?.value}  ${this.form.get('last_name')
      ?.value}`;
  }

  /** Returns the last updated date of the person */
  protected getUpdatedAt() {
    return this.person()?.updated_at;
  }

  /** Navigates to the household detail page if the person belongs to a household */
  protected navigateToHousehold() {
    const household_id = this.person()?.household_id;
    if (household_id) {
      this.router.navigate(['households', household_id]);
    }
  }

  /** Attaches a tag to the person */
  protected tagAdded(tag: string) {
    this.id && this.personsSvc.attachTag(this.id, tag);
  }

  /** Detaches a tag from the person */
  protected tagRemoved(tag: string) {
    this.id && this.personsSvc.detachTag(this.id, tag);
  }

  /**
   * Adds a new person to the backend
   * @param data - Person data to be added
   */
  private add(data: UpdatePersonsType) {
    this.loading.set(true);

    this.personsSvc
      .add(data)
      .then(() => this.alertSvc.showSuccess('Person added'))
      .catch((err: unknown) => this.alertSvc.showError(String(err)))
      .finally(() => this.loading.set(false));
  }

  /**
   * Format an address object into a single readable string.
   * @param address Address components to format
   * @returns Human-readable address string
   */
  private getFormattedAddress(address: AddressType): string {
    const parts: string[] = [];

    const streetParts = [
      address.apt ? `Apt ${address.apt}` : null,
      address.street_num,
      address.street1,
      address.street2,
    ].filter(Boolean);

    const locationParts = [address.city, address.state, address.zip, address.country].filter(Boolean);

    if (streetParts.length) parts.push(streetParts.join(' ').trim());
    if (locationParts.length) parts.push(locationParts.join(', ').trim());

    return parts.join(', ');
  }

  /**
   * Loads the person data from the backend if ID is available
   */
  private async loadPerson() {
    if (!this.id) return;

    this.loading.set(true);
    try {
      this.person.set((await this.personsSvc.getById(this.id)) as Persons);

      await this.getAddressString();
      await this.updateTags();

      this.refreshForm();
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Refreshes the reactive form with the loaded person's data
   */
  private refreshForm() {
    const person = this.person();
    if (!person) return;

    this.form.patchValue(person);
  }

  /**
   * Updates the person in the backend
   * @param data - Partial person data to update
   */
  private update(data: Partial<UpdatePersonsType>) {
    if (!this.id) return;

    this.loading.set(true);
    this.personsSvc
      .update(this.id, data)
      .then(() => {
        this.alertSvc.showSuccess('Person updated successfully.');
        this.form.markAsPristine();
      })
      .catch((err) => this.alertSvc.showError(err))
      .finally(() => this.loading.set(false));
  }

  /**
   * Fetches tags associated with this person
   */
  private async updateTags() {
    if (!this.person()) return;

    const tags = this.id ? await this.personsSvc.getTags(this.id) : [];
    this.tags.set(tags);
  }
}
