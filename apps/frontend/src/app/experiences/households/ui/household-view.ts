/**
 * @file Component for viewing individual household records (read-only mode).
 */
import { DatePipe } from '@angular/common';
import { Component, ElementRef, ViewChild, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Loader } from '@googlemaps/js-api-loader';
import { type IAuthUser } from '../../../../../../../libs/common/src';
import { AlertService } from '@uxcommon/components/alerts/alert-service';
import { Icon } from '@icons/icon';
import { RecordActivities } from '@experiences/activity/ui/record-activities/record-activities';
import { PeopleInHousehold } from '../../persons/ui/people-in-household';
import { UserService } from '../../../services/user.service';
import { HouseholdsService } from '../services/households-service';
import { Households } from '../../../../../../../libs/common/src/lib/kysely.models';
import { ConfirmDialogService } from '../../../services/shared-dialog.service';
import { FormActions } from '@uxcommon/components/form-actions/form-actions';
import { PersonsService } from '@experiences/persons/services/persons-service';
import { Card as PcCard } from '@uxcommon/components/card/card';
import { Tabs, TabPanel, PcTabOption } from '@uxcommon/components/tabs/tabs';
import { StatCard } from '@uxcommon/components/stat-card/stat-card';
import { ProfileCard } from '@uxcommon/components/profile-card/profile-card';
import { DetailRow } from '@uxcommon/components/detail-row/detail-row';

@Component({
  selector: 'pc-household-view',
  imports: [
    DatePipe,
    RouterModule,
    PeopleInHousehold,
    Icon,
    RecordActivities,
    FormActions,
    PcCard,
    Tabs,
    TabPanel,
    StatCard,
    ProfileCard,
    DetailRow,
  ],
  templateUrl: './household-view.html',
})
export class HouseholdView {
  readonly id = input.required<string>();

  private readonly alertSvc = inject(AlertService);
  private readonly userService = inject(UserService);
  private readonly householdsSvc = inject(HouseholdsService);
  private readonly personsSvc = inject(PersonsService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly loader = inject(Loader);
  private readonly dialogSvc = inject(ConfirmDialogService);
  protected readonly isLoading = signal(false);
  protected readonly household = signal<Households | null>(null);
  protected readonly users = signal<IAuthUser[]>([]);
  private usersById = new Map<string, IAuthUser>();

  // Segmentation
  protected readonly tags = signal<string[]>([]);
  protected readonly issues = signal<string[]>([]);
  protected readonly peopleCount = signal(0);

  // Address
  protected readonly addressString = computed(() => {
    const raw = this.household();
    if (!raw) return 'No Address Assigned';
    if (raw.is_placeholder) return 'People with no addresses';
    if (raw.formatted_address) return raw.formatted_address;

    const parts: string[] = [];
    const streetParts = [raw.apt ? `Apt ${raw.apt}` : null, raw.street_num, raw.street1, raw.street2].filter(Boolean);

    const locationParts = [raw.city, raw.state, raw.zip, raw.country].filter(Boolean);

    if (streetParts.length) parts.push(streetParts.join(' ').trim());
    if (locationParts.length) parts.push(locationParts.join(', ').trim());

    return parts.join(', ').trim() || 'No Address Assigned';
  });

  protected readonly hasMap = computed(() => {
    const h = this.household();
    return !!(h && h.lat && h.lng && !h.is_placeholder);
  });

  private mapInitialized = false;

  @ViewChild('mapContainer')
  set mapContainer(elRef: ElementRef | undefined) {
    if (elRef) {
      void this.initMap(elRef.nativeElement);
    } else {
      this.mapInitialized = false;
    }
  }

  // Active tab state
  protected activeTab = signal<string>('activity');

  protected readonly householdTabs = computed<PcTabOption[]>(() => [
    { id: 'activity', label: 'Activity Feed', icon: 'adjustments-horizontal' },
    { id: 'members', label: `Household Members (${this.peopleCount()})`, icon: 'user-group' },
    { id: 'details', label: 'Description & Info', icon: 'information-circle' },
  ]);

  constructor() {
    effect(() => {
      const currentId = this.id();
      untracked(() => this.loadAllData(currentId));
    });

    // Load users for addedby/updatedby display names
    this.userService
      .getUsers()
      .then((u) => {
        this.users.set(u);
        this.usersById = new Map(u.map((x) => [x.id, x]));
      })
      .catch(() => void 0);
  }

  protected async loadAllData(id: string) {
    this.isLoading.set(true);
    try {
      // 1. Load household details
      const householdData = (await this.householdsSvc.getById(id)) as Households;
      this.household.set(householdData);

      // 2. Load tags and issues
      const tagList = await this.householdsSvc.getTags(id, 'tag');
      this.tags.set(tagList);
      const issueList = await this.householdsSvc.getTags(id, 'issue');
      this.issues.set(issueList);

      // 3. Load people in household count
      const count = await this.householdsSvc.getPeopleCount(id);
      this.peopleCount.set(count);
    } catch (err) {
      this.alertSvc.showError('Failed to load household details: ' + String(err));
    } finally {
      this.isLoading.set(false);
    }
  }

  protected editHousehold() {
    this.router.navigate(['edit'], { relativeTo: this.route });
  }

  protected async deleteHousehold() {
    if (!this.id()) return;
    this.isLoading.set(true);
    try {
      // Fetch people belonging to this household
      const people = (await this.personsSvc.getByHouseholdId(this.id(), { columns: ['id'] })) as Array<{ id: string }>;
      const personIds = people.map((p) => p.id);
      const peopleCount = personIds.length;

      if (peopleCount > 0) {
        // Show the 3-option warning dialog
        const choice = await this.dialogSvc.choose<'delete-people' | 'keep-people'>({
          title: 'Households have people',
          message: `1 household(s) being deleted contain ${peopleCount} person(s).\nWhat would you like to do with those people?`,
          variant: 'warning',
          choices: [
            { label: 'Delete people too', value: 'delete-people', variant: 'danger' },
            { label: 'Keep people, just remove their address', value: 'keep-people', variant: 'warning' },
          ],
          cancelText: 'Cancel',
        });

        if (!choice) return; // Handled (user clicked Cancel, so do nothing)

        if (choice === 'keep-people') {
          for (const pid of personIds) {
            await this.personsSvc.removeHousehold(pid);
          }
        } else if (choice === 'delete-people') {
          await this.personsSvc.deleteMany(personIds);
        }
      } else {
        const confirmed = await this.dialogSvc.confirm({
          title: 'Delete Household',
          message: 'Are you sure you want to delete this household? This action cannot be undone.',
          variant: 'danger',
          confirmText: 'Delete',
        });
        if (!confirmed) return;
      }

      await this.householdsSvc.delete(this.id());
      this.householdsSvc.triggerRefresh();
      this.alertSvc.showSuccess('Household deleted');
      await this.router.navigate(['/households']);
    } catch (err: any) {
      const message = err?.message || err?.data?.message || 'Unable to delete household';
      this.alertSvc.showError(message);
    } finally {
      this.isLoading.set(false);
    }
  }

  private async initMap(mapEl: HTMLElement) {
    const h = this.household();
    if (!h || !h.lat || !h.lng || h.is_placeholder || this.mapInitialized) return;

    try {
      await this.loader.importLibrary('maps');
      const { AdvancedMarkerElement } = (await this.loader.importLibrary('marker')) as any;
      const center = { lat: Number(h.lat), lng: Number(h.lng) };
      const map = new google.maps.Map(mapEl, {
        center,
        zoom: 15,
        disableDefaultUI: false,
        zoomControl: true,
        streetViewControl: false,
        mapTypeControl: false,
        mapId: 'DEMO_MAP_ID',
      });

      new AdvancedMarkerElement({
        position: center,
        map,
        title: this.addressString(),
      });
      this.mapInitialized = true;
    } catch (err) {
      console.error('Failed to load Google Map:', err);
    }
  }

  protected copyToClipboard(text: string | null | undefined, label: string) {
    if (!text) return;
    navigator.clipboard
      .writeText(text)
      .then(() => {
        this.alertSvc.showSuccess(`${label} copied to clipboard`);
      })
      .catch(() => {
        this.alertSvc.showError(`Failed to copy ${label}`);
      });
  }

  protected getCreatedAt(): Date | null {
    const date = this.household()?.created_at;
    if (!date) return null;
    return new Date(date as any);
  }

  protected getUpdatedAt(): Date | null {
    const date = this.household()?.updated_at;
    if (!date) return null;
    return new Date(date as any);
  }

  protected getUserName(id: string | null | undefined): string {
    if (!id) return '?';
    return this.usersById.get(String(id))?.first_name ?? '?';
  }
}
