/**
 * @file Component for creating or updating individual person records.
 */
import { Component, OnInit, effect, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { UpdatePersonsType } from '@common';
import { ConfirmDialogService } from '@services/shared-dialog.service';
import { AddBtnRow } from '@uxcommon/components/add-btn-row/add-btn-row';
import { AlertService } from '@uxcommon/components/alerts/alert-service';
import { FormInput } from '@uxcommon/components/form-input/formInput';
import { Icon } from '@uxcommon/components/icons/icon';
import { Tags } from '@uxcommon/components/tags/tags';
import { TextArea } from '@uxcommon/components/textarea/textarea';
import { createLoadingGate } from '@uxcommon/loading-gate';

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
  imports: [FormInput, ReactiveFormsModule, Tags, AddBtnRow, TextArea, RouterModule, PeopleInHousehold, Icon],
  templateUrl: './person-detail.html',
})
export class PersonDetail implements OnInit {
  private readonly alertSvc = inject(AlertService);
  private readonly confirmDlg = inject(ConfirmDialogService);
  private readonly fb = inject(FormBuilder);
  private readonly householdsSvc = inject(HouseholdsService);
  private readonly personsSvc = inject(PersonsService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  private _loading = createLoadingGate();

  protected readonly addressString = signal<string | null>(null);

  // Drawer state for assigning household
  protected readonly assignDrawerOpen = signal(false);
  protected readonly householdId = signal<string | null>(null);
  protected readonly householdResults = signal<any[]>([]);
  protected readonly householdSearch = signal('');
  protected readonly householdsLoading = signal(false);
  protected readonly isLoading = this._loading.visible;
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

    // Sync householdId from person without causing feedback loops
    effect(() => {
      const person = this.person();
      const nextHouseholdId = person?.household_id ?? null;
      if (this.householdId() !== nextHouseholdId) {
        this.householdId.set(nextHouseholdId);
      }
    });

    // React to householdId changes without writing back to person (avoid loop)
    effect(async () => {
      const householdId = this.householdId();

      if (householdId) {
        const address = (await this.householdsSvc.getById(householdId)) as AddressType;
        this.addressString.set(this.getFormattedAddress(address));
      }
    });
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

  /** Assign current person to the selected household */
  protected async assignToHousehold(household_id: string) {
    if (!this.id) return;

    // Ask scope: just this person vs everyone in current household
    const applyToAll = await this.confirmDlg.confirm({
      title: 'Change household',
      message: 'Apply to everyone in the current household, or just this person?',
      variant: 'info',
      confirmText: 'Everyone',
      cancelText: 'Just this person',
    });

    const currentHousehold = this.householdId();

    const end = this._loading.begin();
    try {
      if (applyToAll && currentHousehold) {
        // Move all people from current household to the selected one
        const people = (await this.personsSvc.getByHouseholdId(currentHousehold, { columns: ['id'] })) as {
          id: string;
        }[];
        await Promise.all(people.map((p) => this.personsSvc.update(p.id, { household_id } as UpdatePersonsType)));
      } else {
        // Only move this person
        await this.personsSvc.update(this.id, { household_id } as UpdatePersonsType);
      }

      // update local state for current person and UI
      this.person.update((p) => (p ? { ...p, household_id } : p));

      this.alertSvc.showSuccess('Assigned to selected household');
      this.closeAssignDrawer();
    } catch (err) {
      this.alertSvc.showError(String(err));
    } finally {
      end();
    }
  }

  /** Close the assign household drawer */
  protected closeAssignDrawer() {
    this.assignDrawerOpen.set(false);
  }

  /** Format a household row to a single line address */
  protected formatHouseholdRow(row: any) {
    const address = {
      apt: row.apt ?? null,
      street_num: row.street_num ?? '',
      street1: row.street1 ?? '',
      street2: row.street2 ?? '',
      city: row.city ?? '',
      state: row.state ?? '',
      zip: row.zip ?? '',
      country: row.country ?? '',
    } as AddressType;
    return this.getFormattedAddress(address);
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
    const household_id = this.householdId();
    if (household_id) {
      this.router.navigate(['households', household_id]);
    }
  }

  /** Handle search input for households */
  protected onHouseholdSearch(ev: Event) {
    const target = ev.target as HTMLInputElement | null;
    const val = target?.value ?? '';
    this.householdSearch.set(val);
    void this.fetchHouseholds();
  }

  /** Open the right-side drawer for assigning household */
  protected openAssignDrawer() {
    this.assignDrawerOpen.set(true);
    // Initial fetch
    void this.fetchHouseholds();
  }

  /**
   * Remove the current address by moving the person to a new blank household.
   * This preserves DB constraints (non-null household_id) while clearing address fields.
   */
  protected async removeAddress() {
    if (!this.id || !this.person()) return;
    const confirmed = await this.confirmDlg.confirm({
      title: 'Remove Address',
      message: 'This will move the person to a new blank household (clearing address). Continue?',
      variant: 'danger',
      confirmText: 'Remove',
      cancelText: 'Cancel',
    });
    if (!confirmed) return;

    const end = this._loading.begin();
    try {
      this.person.update((p) => (p ? { ...p, householdId: null } : p));

      this.alertSvc.showSuccess('Address removed');
    } catch (err) {
      this.alertSvc.showError(String(err));
    } finally {
      end();
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
    const end = this._loading.begin();
    this.personsSvc
      .add(data)
      .then(() => this.alertSvc.showSuccess('Person added'))
      .catch((err: unknown) => this.alertSvc.showError(String(err)))
      .finally(() => end());
  }

  /** Fetch households matching the current search */
  private async fetchHouseholds() {
    try {
      this.householdsLoading.set(true);
      const opts = {
        searchStr: this.householdSearch(),
        limit: 25,
        columns: ['id', 'street_num', 'street1', 'street2', 'apt', 'city', 'state', 'zip', 'country', 'persons_count'],
      };
      const res = await this.householdsSvc.getAll(opts);
      this.householdResults.set(res.rows || []);
    } catch (err) {
      this.alertSvc.showError(String(err));
      this.householdResults.set([]);
    } finally {
      this.householdsLoading.set(false);
    }
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

    const end = this._loading.begin();
    try {
      this.person.set((await this.personsSvc.getById(this.id)) as Persons);

      await this.updateTags();

      this.refreshForm();
    } finally {
      end();
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

    const end = this._loading.begin();
    this.personsSvc
      .update(this.id, data)
      .then(() => {
        this.alertSvc.showSuccess('Person updated successfully.');
        this.form.markAsPristine();
      })
      .catch((err) => this.alertSvc.showError(err))
      .finally(() => end());
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
