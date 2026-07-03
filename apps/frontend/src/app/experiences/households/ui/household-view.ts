import { Component, ElementRef, viewChild, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Loader } from '@googlemaps/js-api-loader';
import type { IAuthUser } from '@common';
import { AlertService } from '@uxcommon/components/alerts/alert-service';
import { Icon } from '@icons/icon';
import { RecordActivities } from '@experiences/activity/ui/record-activities/record-activities';
import { PeopleInHousehold } from '../../persons/ui/people-in-household';
import { UserService } from '../../../services/user.service';
import { HouseholdsService } from '../services/households-service';
import { Households } from '../../../../../../../libs/common/src/lib/kysely.models';
import { ConfirmDialogService } from '../../../services/shared-dialog.service';
import { PersonsService } from '@experiences/persons/services/persons-service';
import { Card as PcCard } from '@uxcommon/components/card/card';
import { Tabs, TabPanel, PcTabOption } from '@uxcommon/components/tabs/tabs';
import { StatCard } from '@uxcommon/components/stat-card/stat-card';
import { ProfileCard } from '@uxcommon/components/profile-card/profile-card';
import { DetailItem } from '@uxcommon/components/detail-item/detail-item';
import { DetailLayout } from '@uxcommon/components/detail-layout/detail-layout';
import { SystemMetadata } from '@uxcommon/components/system-metadata/system-metadata';
import { Tags } from '@experiences/tags/ui/tags';
import { createLoadingGate } from '@uxcommon/loading-gate';

@Component({
  selector: 'pc-household-view',
  imports: [
    RouterModule,
    PeopleInHousehold,
    Icon,
    RecordActivities,
    DetailLayout,
    PcCard,
    Tabs,
    TabPanel,
    StatCard,
    ProfileCard,
    DetailItem,
    SystemMetadata,
    Tags,
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
  private readonly _loading = createLoadingGate();
  protected readonly isLoading = this._loading.visible;
  protected readonly initialized = signal(false);
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
  private readonly mapContainer = viewChild<ElementRef>('mapContainer');

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
      void untracked(() => this.loadAllData(currentId));
    });

    effect(() => {
      const elRef = this.mapContainer();
      if (elRef) {
        void this.initMap(elRef.nativeElement);
      } else {
        this.mapInitialized = false;
      }
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
    const end = this._loading.begin();
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
      end();
      this.initialized.set(true);
    }
  }

  protected editHousehold() {
    void this.router.navigate(['edit'], { relativeTo: this.route });
  }

  protected async deleteHousehold() {
    if (!this.id()) return;
    const end = this._loading.begin();
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
    } catch (err) {
      const message =
        err instanceof Error && err.message
          ? err.message
          : isRecord(err) &&
              isRecord(err['data']) &&
              typeof err['data']['message'] === 'string' &&
              err['data']['message']
            ? err['data']['message']
            : 'Unable to delete household';
      this.alertSvc.showError(message);
    } finally {
      end();
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

  protected getUserName(id: string | null | undefined): string {
    if (!id) return '?';
    return this.usersById.get(String(id))?.first_name ?? '?';
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
