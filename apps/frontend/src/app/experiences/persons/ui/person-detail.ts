/**
 * @file Component for creating or updating individual person records.
 */
import { DatePipe } from '@angular/common';
import { Component, OnInit, computed, effect, inject, input, signal , ChangeDetectionStrategy} from '@angular/core';
import { form, FormField } from '@angular/forms/signals';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { type IAuthUser, UpdatePersonsType } from '@common';
import { ConfirmDialogService } from '../../../services/shared-dialog.service';
import { AddBtnRow } from '@uxcommon/components/add-btn-row/add-btn-row';
import { AlertService } from '@uxcommon/components/alerts/alert-service';
import { Icon } from '@uxcommon/components/icons/icon';
import { Tags } from '@uxcommon/components/tags/tags';
import { createLoadingGate } from '@uxcommon/loading-gate';

import { ColumnType } from 'kysely';

import { AuthService } from '../../../auth/auth-service';
import { HouseholdsService } from '../../households/services/households-service';
import { PersonsService } from '../services/persons-service';
import { TeamsService } from '../../teams/services/teams-service';
import { PeopleInHousehold } from './people-in-household';
import { AddressType, Persons } from 'common/src/lib/kysely.models';

/**
 * Component for displaying and editing a single person's details.
 * Handles both "new" (creation) and "edit" (update) modes.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'pc-person-detail',
  imports: [DatePipe, FormField, Tags, AddBtnRow, RouterModule, PeopleInHousehold, Icon],
  templateUrl: './person-detail.html',
})
export class PersonDetail implements OnInit {
  private readonly alertSvc = inject(AlertService);
  private readonly auth = inject(AuthService);
  private readonly confirmDlg = inject(ConfirmDialogService);
  private readonly householdsSvc = inject(HouseholdsService);
  private readonly personsSvc = inject(PersonsService);
  private readonly teamsSvc = inject(TeamsService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  private _loading = createLoadingGate();
  private usersById = new Map<string, IAuthUser>();

  protected readonly addressString = signal<string | null>(null);

  // Drawer state for assigning household
  protected readonly assignDrawerOpen = signal(false);
  protected readonly householdResults = signal<any[]>([]);
  protected readonly householdSearch = signal('');
  protected readonly householdsLoading = signal(false);

  /**
   * Tracks the household selected in the drawer when creating a NEW person
   * (before the record is saved and `this.id` exists).
   */
  protected readonly pendingHouseholdId = signal<string | null>(null);
  protected readonly isLoading = this._loading.visible;

  /** Inline error shown under the email field when a duplicate is detected */
  protected readonly emailError = signal<string | null>(null);
  protected readonly person = signal<Persons | null>(null);
  protected readonly users = signal<IAuthUser[]>([]);

  /** Backing payload signal for person data */
  protected readonly payload = signal({
    first_name: '',
    middle_names: '',
    last_name: '',
    email: '',
    email2: '',
    home_phone: '',
    mobile: '',
    notes: '',
  });

  /** Signal form for person data validation and status tracking */
  protected readonly form = form(this.payload);

  /** ID of the person being edited (if in edit mode) */
  protected id: string | null = null;
  protected tags = signal<string[]>([]);

  public readonly householdId = computed(
    () => (this.person()?.household_id ?? null) || this.pendingHouseholdId()
  );

  /** Determines if this component is in 'edit' or 'new' mode */
  public mode = input<'new' | 'edit'>('edit');

  /** Reactive display name derived from live form values — avoids method calls in template */
  protected readonly formName = computed(() => {
    const v = this.payload();
    return `${v.first_name || ''} ${v.middle_names || ''} ${v.last_name || ''}`.trim();
  });

  /** Two-letter initials derived from formName for the avatar chip */
  protected readonly formInitials = computed(() => {
    const name = this.formName() || '?';
    return name
      .split(' ')
      .slice(0, 2)
      .map((w) => w[0] ?? '')
      .join('')
      .toUpperCase();
  });


  /** Whether to show 'two' or 'three' buttons — depends on whether person is already saved */
  protected readonly buttonsToShow = computed<'two' | 'three'>(() =>
    this.person()?.id ? 'two' : 'three'
  );

  /**
   * Initializes the component and determines edit mode via route params.
   */
  constructor() {
    if (this.mode() === 'edit') {
      this.id = this.route.snapshot.paramMap.get('id');
    }

    // Load users once for display names
    this.auth
      .getUsers()
      .then((u) => {
        this.users.set(u);
        this.usersById = new Map(u.map((x) => [x.id, x]));
      })
      .catch(() => void 0);

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
  public save(done?: () => void) {
    this.form().markAsTouched();
    if (this.form().invalid()) return;
    const data = this.payload() as UpdatePersonsType;
    return this.id ? this.update(data, done) : this.add(data, done);
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
    // NEW PERSON: just store the pending selection; it will be sent on save
    if (!this.id) {
      this.pendingHouseholdId.set(household_id);
      this.alertSvc.showSuccess('Household selected — it will be saved when you add the person');
      this.closeAssignDrawer();
      return;
    }

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

  /** Returns the creation date of the person as a Date (for pipes) */
  protected getCreatedAt(): Date | null {
    return this.getDateFrom(this.person()?.created_at);
  }

  protected getId() {
    const id = this.person()?.id;
    if (!id) return null;

    return id as unknown as string;
  }

  /** Returns the last updated date of the person as a Date (for pipes) */
  protected getUpdatedAt() {
    return this.getDateFrom(this.person()?.updated_at);
  }

  /** Get the display name for a user id */
  protected getUserName(id: string | null | undefined = null): string {
    if (!id) return '?';
    return this.usersById.get(String(id))?.first_name ?? '?';
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
   * Remove the current address.
   * - New person (unsaved): just clears the pending household selection.
   * - Existing person: calls the backend to move the person to a blank household.
   */
  protected async removeAddress() {
    // New person: just clear the pending household — no API call needed yet
    if (!this.id) {
      this.pendingHouseholdId.set(null);
      this.addressString.set(null);
      return;
    }

    if (!this.person()) return;

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
      await this.personsSvc.removeHousehold(this.id);
      this.person.update((p) => (p ? { ...p, household_id: null as any } : p));
      this.addressString.set(null);
      this.alertSvc.showInfo('The person has been removed from the household. You may select a different household');
    } catch (err) {
      this.alertSvc.showError(String(err));
    } finally {
      end();
    }
  }

  /** Attaches a tag to the person */
  protected tagAdded(tag: string) {
    if (!this.id) return;
    void this.personsSvc.attachTag(this.id, tag);
  }

  /** Detaches a tag from the person */
  protected async tagRemoved(tag: string) {
    if (!this.id) return;

    const normalized = tag.trim().toLowerCase();
    const restoreTag = () =>
      this.tags.update((curr) => (curr.includes(tag) ? curr : [...curr, tag]));

    try {
      if (normalized === 'volunteer') {
        let teams: Array<{ id: string; name: string; is_captain: boolean }> = [];
        try {
          teams = await this.teamsSvc.getTeamsForVolunteer(this.id);
        } catch (err) {
          console.error('Failed to load teams for volunteer tag removal', err);
        }

        if (teams.length) {
          const details = teams
            .map((team) => `• ${team.name || 'Unnamed team'}${team.is_captain ? ' (captain)' : ''}`)
            .join('\n');
          const confirmed = await this.confirmDlg.confirm({
            title: 'Remove volunteer tag?',
            message:
              'Removing the volunteer tag will also remove this person from the following teams:\n\n' +
              details +
              '\n\nDo you want to continue?',
            confirmText: 'Remove tag',
            cancelText: 'Keep tag',
            variant: 'warning',
          });
          if (!confirmed) {
            restoreTag();
            return;
          }
        }

        const result = await this.personsSvc.detachTag(this.id, tag);
        await this.updateTags();
        if (result?.removed_teams && result.removed_teams.length > 0) {
          const names = result.removed_teams.map((team) => team.name || 'Unnamed team');
          this.alertSvc.showSuccess(`Removed from teams: ${names.join(', ')}`);
        }
        return;
      }

      await this.personsSvc.detachTag(this.id, tag);
      await this.updateTags();
    } catch (err) {
      this.alertSvc.showError(String(err));
      restoreTag();
    }
  }

  /**
   * Adds a new person to the backend
   * @param data - Person data to be added
   */
  private add(data: UpdatePersonsType, done?: () => void) {
    // Include any household selected via the drawer before saving
    const pendingHousehold = this.pendingHouseholdId();
    if (pendingHousehold) {
      data = { ...data, household_id: pendingHousehold } as UpdatePersonsType;
    }

    this.emailError.set(null);
    const end = this._loading.begin();
    this.personsSvc
      .add(data)
      .then(() => {
        this.alertSvc.showSuccess('Person added');
        this.personsSvc.triggerRefresh();
        if (done) {
          done();
          this.pendingHouseholdId.set(null);
          this.addressString.set(null);
          this.tags.set([]);
          this.form().reset();
        }
      })
      .catch((err: unknown) => {
        if (this.isDuplicateEmailError(err)) {
          this.emailError.set('This email address is already used by another person.');
        } else {
          this.alertSvc.showError(String(err));
        }
      })
      .finally(() => end());
  }

  /** Returns true when the error is a backend CONFLICT (duplicate email) */
  private isDuplicateEmailError(err: unknown): boolean {
    if (!err || typeof err !== 'object') return false;
    const e = err as Record<string, any>;
    // tRPC wraps backend errors; check both data.httpStatus and message
    return (
      e['data']?.['httpStatus'] === 409 ||
      String(e['message'] ?? '').toLowerCase().includes('already exists')
    );
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

  private getDateFrom(date: ColumnType<Date, string | Date | undefined, string | Date> | null | undefined) {
    if (!date) return null;
    if (date instanceof Date) return date;

    // If date is a Kysely ColumnType, extract the value
    const value = typeof date === 'object' && 'toString' in date ? date.toString() : (date as string);
    return new Date(value);
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

    this.payload.set({
      first_name: person.first_name ?? '',
      middle_names: person.middle_names ?? '',
      last_name: person.last_name ?? '',
      email: person.email ?? '',
      email2: person.email2 ?? '',
      home_phone: person.home_phone ?? '',
      mobile: person.mobile ?? '',
      notes: person.notes ?? '',
    });
  }

  /**
   * Updates the person in the backend
   * @param data - Partial person data to update
   */
  private update(data: Partial<UpdatePersonsType>, done?: () => void) {
    if (!this.id) return;

    this.emailError.set(null);
    const end = this._loading.begin();
    this.personsSvc
      .update(this.id, data)
      .then(() => {
        this.alertSvc.showSuccess('Person updated successfully.');
        this.form().reset();
        this.personsSvc.triggerRefresh();
        if (done) {
          done();
        }
      })
      .catch((err: unknown) => {
        if (this.isDuplicateEmailError(err)) {
          this.emailError.set('This email address is already used by another person.');
        } else {
          this.alertSvc.showError(String(err));
        }
      })
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
