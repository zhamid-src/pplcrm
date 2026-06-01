/**
 * @file Component for viewing individual household records (read-only mode).
 */
import { DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { Loader } from '@googlemaps/js-api-loader';
import { type IAuthUser } from '@common';
import { AlertService } from '@uxcommon/components/alerts/alert-service';
import { Icon } from '@icons/icon';
import { RecordActivities } from '@uxcommon/components/record-activities/record-activities';
import { PeopleInHousehold } from '../../persons/ui/people-in-household';
import { AuthService } from '../../../auth/auth-service';
import { HouseholdsService } from '../services/households-service';
import { Households } from 'common/src/lib/kysely.models';

@Component({
  selector: 'pc-household-view',
  imports: [DatePipe, RouterModule, PeopleInHousehold, Icon, RecordActivities],
  templateUrl: './household-view.html',
})
export class HouseholdView implements OnInit {
  private readonly alertSvc = inject(AlertService);
  private readonly auth = inject(AuthService);
  private readonly householdsSvc = inject(HouseholdsService);
  private readonly route = inject(ActivatedRoute);
  private readonly loader = inject(Loader);

  protected id: string | null = null;
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
    const streetParts = [
      raw.apt ? `Apt ${raw.apt}` : null,
      raw.street_num,
      raw.street1,
      raw.street2,
    ].filter(Boolean);

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

  // Active tab state
  protected activeTab = signal<'members' | 'activity' | 'details'>('members');

  constructor() {
    this.id = this.route.snapshot.paramMap.get('id');

    // Load users for addedby/updatedby display names
    this.auth
      .getUsers()
      .then((u) => {
        this.users.set(u);
        this.usersById = new Map(u.map((x) => [x.id, x]));
      })
      .catch(() => void 0);
  }

  public ngOnInit() {
    void this.loadAllData();
  }

  protected async loadAllData() {
    if (!this.id) return;
    this.isLoading.set(true);
    try {
      // 1. Load household details
      const householdData = (await this.householdsSvc.getById(this.id)) as Households;
      this.household.set(householdData);

      // 2. Load tags and issues
      const tagList = await this.householdsSvc.getTags(this.id, 'tag');
      this.tags.set(tagList);
      const issueList = await this.householdsSvc.getTags(this.id, 'issue');
      this.issues.set(issueList);

      // 3. Load people in household count
      const count = await this.householdsSvc.getPeopleCount(this.id);
      this.peopleCount.set(count);

      // 4. Initialize Google Map if lat/lng are present
      if (this.hasMap()) {
        setTimeout(() => void this.initMap(), 0);
      }
    } catch (err) {
      this.alertSvc.showError('Failed to load household details: ' + String(err));
    } finally {
      this.isLoading.set(false);
    }
  }

  private async initMap() {
    const h = this.household();
    if (!h || !h.lat || !h.lng || h.is_placeholder || this.mapInitialized) return;

    try {
      await this.loader.importLibrary('maps');
      const mapEl = document.getElementById('household-map');
      if (mapEl) {
        const center = { lat: Number(h.lat), lng: Number(h.lng) };
        const map = new google.maps.Map(mapEl, {
          center,
          zoom: 15,
          disableDefaultUI: false,
          zoomControl: true,
          streetViewControl: false,
          mapTypeControl: false,
        });

        new google.maps.Marker({
          position: center,
          map,
          title: this.addressString(),
        });
        this.mapInitialized = true;
      }
    } catch (err) {
      console.error('Failed to load Google Map:', err);
    }
  }

  protected copyToClipboard(text: string | null | undefined, label: string) {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      this.alertSvc.showSuccess(`${label} copied to clipboard`);
    }).catch(() => {
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
