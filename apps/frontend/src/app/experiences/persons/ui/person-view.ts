/**
 * @file Component for viewing individual person records (read-only mode).
 */
import { DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, resource, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { type IAuthUser } from '@common';
import { type AddressType } from 'common/src/lib/kysely.models';
import { AlertService } from '@uxcommon/components/alerts/alert-service';
import { Icon } from '@uxcommon/components/icons/icon';
import { RecordActivities } from '@uxcommon/components/record-activities/record-activities';
import { PeopleInHousehold } from './people-in-household';
import { AuthService } from '../../../auth/auth-service';
import { HouseholdsService } from '../../households/services/households-service';
import { PersonsService } from '../services/persons-service';
import { VolunteerService } from '../../../services/api/volunteer-service';

@Component({
  selector: 'pc-person-view',
  imports: [DatePipe, RouterModule, PeopleInHousehold, Icon, RecordActivities],
  templateUrl: './person-view.html',
})
export class PersonView implements OnInit {
  private readonly alertSvc = inject(AlertService);
  private readonly auth = inject(AuthService);
  private readonly householdsSvc = inject(HouseholdsService);
  private readonly personsSvc = inject(PersonsService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly volunteerSvc = inject(VolunteerService);

  protected id: string | null = null;
  protected readonly isLoading = signal(false);
  protected readonly person = signal<any | null>(null);
  protected readonly users = signal<IAuthUser[]>([]);
  private usersById = new Map<string, IAuthUser>();

  // Analytics & Lists
  protected readonly volunteerStats = signal<{ shifts_count: number; total_hours: number } | null>(null);
  protected readonly volunteerHistory = signal<any[]>([]);
  protected readonly activityData = signal<{ emails: any[]; newsletters: any[] }>({ emails: [], newsletters: [] });
  protected readonly openedNewslettersCount = computed(() => {
    return this.activityData().newsletters.filter(
      (n: any) => n.event_type === 'open' || n.event_type === 'click'
    ).length;
  });
  protected readonly tags = signal<string[]>([]);
  protected readonly issues = signal<string[]>([]);

  // Address
  protected readonly householdId = computed(() => this.person()?.household_id ?? null);
  protected readonly householdResource = resource({
    params: () => this.householdId(),
    loader: async ({ params: householdId }) => {
      if (!householdId) return null;
      try {
        return await this.householdsSvc.getById(householdId);
      } catch {
        return null;
      }
    },
  });
  protected readonly addressString = computed(() => {
    const hh = this.householdResource.value();
    if (!hh || hh.is_placeholder) return 'No Address Assigned';
    return this.getFormattedAddress(hh);
  });
  protected readonly isPlaceholderHousehold = computed(() => {
    return this.householdResource.value()?.is_placeholder ?? false;
  });

  // Contact initials and full name computation
  protected readonly initials = computed(() => {
    const first = this.person()?.first_name || '';
    const last = this.person()?.last_name || '';
    if (!first && !last) return '?';
    return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
  });

  protected readonly fullName = computed(() => {
    const p = this.person();
    if (!p) return '';
    return `${p.first_name || ''} ${p.middle_names || ''} ${p.last_name || ''}`.trim();
  });

  // Active tab state
  protected activeTab = signal<'activity' | 'emails' | 'newsletters' | 'volunteer' | 'household'>('activity');

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
      // 1. Load person details
      const personData = await this.personsSvc.getById(this.id);
      this.person.set(personData);

      // 2. Load tags and issues
      const tagList = await this.personsSvc.getTags(this.id, 'tag');
      this.tags.set(tagList);
      const issueList = await this.personsSvc.getTags(this.id, 'issue');
      this.issues.set(issueList);

      // 3. Load volunteer stats and history
      try {
        const stats = await this.volunteerSvc.getVolunteerStats(this.id);
        this.volunteerStats.set(stats);
        const history = await this.volunteerSvc.getHistoryForPerson(this.id);
        this.volunteerHistory.set(history || []);
      } catch (err) {
        console.error('Failed to load volunteer details', err);
      }

      // 4. Load interactions (emails + newsletters)
      try {
        const activity = await this.personsSvc.getActivity(this.id);
        this.activityData.set(activity || { emails: [], newsletters: [] });
      } catch (err) {
        console.error('Failed to load activity log', err);
      }
    } catch (err) {
      this.alertSvc.showError('Failed to load person details: ' + String(err));
    } finally {
      this.isLoading.set(false);
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
    const date = this.person()?.created_at;
    if (!date) return null;
    return new Date(date);
  }

  protected getUpdatedAt(): Date | null {
    const date = this.person()?.updated_at;
    if (!date) return null;
    return new Date(date);
  }

  protected getUserName(id: string | null | undefined): string {
    if (!id) return '?';
    return this.usersById.get(String(id))?.first_name ?? '?';
  }

  protected navigateToHousehold() {
    const household_id = this.householdId();
    if (household_id) {
      this.router.navigate(['households', household_id]);
    }
  }

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

    const formatted = parts.join(', ').trim();
    return formatted || 'No Address Assigned';
  }
}
