import { Component, OnInit, input, signal, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { UpdatePersonsType } from '@common';
import { AlertService } from '@uxcommon/alert-service';
import { AddBtnRow } from '@uxcommon/add-btn-row';
import { FormInput } from '@uxcommon/formInput';
import { PeopleInHousehold } from 'apps/frontend/src/app/components/persons/people-in-household';
import { Tags } from 'apps/frontend/src/app/components/tags/tags';
import { TextArea } from '@uxcommon/textarea';
import { AddressType, Persons } from 'common/src/lib/kysely.models';
import { PersonsService } from './persons-service';
import { HouseholdsService } from '../households/households-service';

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
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private personsSvc = inject(PersonsService);
  private householdsSvc = inject(HouseholdsService);
  private alertSvc = inject(AlertService);

  /** Determines if this component is in 'edit' or 'new' mode */
  public mode = input<'new' | 'edit'>('edit');

  protected addressString = signal<string | null>(null);

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

  protected _person = signal<Persons | null>(null);

  /** Getter for the current person */
  protected get person() {
    return this._person();
  }

  /** Setter for the current person */
  protected set person(person: Persons | null) {
    this._person.set(person);
  }

  protected processing = signal(false);
  protected tags: string[] = [];

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
    if (this.person?.household_id) {
      const address = (await this.householdsSvc.getById(this.person.household_id)) as AddressType;
      this.addressString.set(address.formatted_address || null);
    }
  }

  /** Returns the creation date of the person */
  protected getCreatedAt() {
    return this.person?.created_at;
  }

  /** Returns the full name of the person constructed from form inputs */
  protected getFormName() {
    return `${this.form.get('first_name')?.value} ${
      this.form.get('middle_names')?.value
    }  ${this.form.get('last_name')?.value}`;
  }

  /** Returns the last updated date of the person */
  protected getUpdatedAt() {
    return this.person?.updated_at;
  }

  /** Navigates to the household detail page if the person belongs to a household */
  protected navigateToHousehold() {
    if (this.person?.household_id) {
      this.router.navigate(['console', 'households', this.person.household_id]);
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
    this.processing.set(true);
    this.personsSvc
      .add(data)
      .then(() => this.alertSvc.showSuccess('Person added'))
      .catch((err) => this.alertSvc.showError(err))
      .finally(() => this.processing.set(false));
  }

  /**
   * Fetches tags associated with this person
   */
  private async getTags() {
    if (!this.person) {
      return;
    }
    this.tags = this.id ? await this.personsSvc.getTags(this.id) : [];
  }

  /**
   * Loads the person data from the backend if ID is available
   */
  private async loadPerson() {
    if (!this.id) {
      return;
    }
    this.processing.set(true);

    this.person = (await this.personsSvc.getById(this.id)) as Persons;
    this.getAddressString();
    this.getTags();

    this.refreshForm();

    this.processing.set(false);
  }

  /**
   * Refreshes the reactive form with the loaded person's data
   */
  private refreshForm() {
    if (!this.person) {
      return;
    }
    this.form.patchValue(this.person);
  }

  /**
   * Updates the person in the backend
   * @param data - Partial person data to update
   */
  private update(data: Partial<UpdatePersonsType>) {
    if (!this.id) {
      return;
    }

    this.processing.set(true);
    this.personsSvc
      .update(this.id, data)
      .then(() => {
        this.alertSvc.showSuccess('Person updated successfully.');
        this.form.markAsPristine();
      })
      .catch((err) => this.alertSvc.showError(err))
      .finally(() => this.processing.set(false));
  }
}
