/**
 * @file Component for viewing individual person records (read-only mode).
 */
import { DatePipe } from '@angular/common';
import { Component, computed, effect, inject, input, resource, signal, untracked } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { type AddressType } from 'common/src/lib/kysely.models';
import { AlertService } from '@uxcommon/components/alerts/alert-service';
import { Icon } from '@uxcommon/components/icons/icon';
import { RecordActivities } from '@experiences/activity/ui/record-activities/record-activities';
import { PeopleInHousehold } from './people-in-household';
import { UserService } from '../../../services/user.service';
import { HouseholdsService } from '../../households/services/households-service';
import { PersonsService } from '../services/persons-service';
import { VolunteerService } from '../../../services/api/volunteer-service';
import { FormActions } from '@uxcommon/components/form-actions/form-actions';
import { ConfirmDialogService } from '../../../services/shared-dialog.service';
import { createLoadingGate } from '@uxcommon/loading-gate';

@Component({
  selector: 'pc-person-view',
  imports: [DatePipe, RouterModule, PeopleInHousehold, Icon, RecordActivities, FormActions],
  templateUrl: './person-view.html',
})
export class PersonView {
  readonly id = input.required<string>();

  private readonly alertSvc = inject(AlertService);
  private readonly userService = inject(UserService);
  private readonly householdsSvc = inject(HouseholdsService);
  private readonly personsSvc = inject(PersonsService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly dialogs = inject(ConfirmDialogService);
  private readonly volunteerSvc = inject(VolunteerService);

  private readonly _loading = createLoadingGate();
  protected readonly isLoading = this._loading.visible;
  protected readonly initialized = signal(false);

  protected readonly person = signal<any | null>(null);

  private readonly usersResource = resource({
    loader: () => this.userService.getUsers(),
  });
  private readonly usersById = computed(() => new Map((this.usersResource.value() ?? []).map((x) => [x.id, x])));

  // Analytics & Lists
  protected readonly volunteerStats = signal<{ shifts_count: number; total_hours: number } | null>(null);
  protected readonly volunteerHistory = signal<any[]>([]);
  protected readonly activityData = signal<{ emails: any[]; newsletters: any[] }>({ emails: [], newsletters: [] });
  protected readonly openedNewslettersCount = computed(() => {
    return this.activityData().newsletters.filter((n: any) => n.event_type === 'open' || n.event_type === 'click')
      .length;
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
    effect(() => {
      const currentId = this.id();
      untracked(() => this.loadAllData(currentId));
    });
  }

  protected async loadAllData(id: string) {
    const end = this._loading.begin();
    try {
      // 1. Load person details
      const personData = await this.personsSvc.getById(id);
      this.person.set(personData);

      // 2. Load tags and issues
      const tagList = await this.personsSvc.getTags(id, 'tag');
      this.tags.set(tagList);
      const issueList = await this.personsSvc.getTags(id, 'issue');
      this.issues.set(issueList);

      // 3. Load volunteer stats and history
      try {
        const stats = await this.volunteerSvc.getVolunteerStats(id);
        this.volunteerStats.set(stats);
        const history = await this.volunteerSvc.getHistoryForPerson(id);
        this.volunteerHistory.set(history || []);
      } catch (err) {
        console.error('Failed to load volunteer details', err);
      }

      // 4. Load interactions (emails + newsletters)
      try {
        const activity = await this.personsSvc.getActivity(id);
        this.activityData.set(activity || { emails: [], newsletters: [] });
      } catch (err) {
        console.error('Failed to load activity log', err);
      }
    } catch (err) {
      this.alertSvc.showError('Failed to load person details: ' + String(err));
    } finally {
      end();
      this.initialized.set(true);
    }
  }

  protected editPerson() {
    this.router.navigate(['edit'], { relativeTo: this.route });
  }

  protected async deletePerson() {
    if (!this.id()) return;
    const confirmed = await this.dialogs.confirm({
      title: 'Delete Person',
      message: 'Are you sure you want to delete this person? This action cannot be undone.',
      variant: 'danger',
      confirmText: 'Delete',
    });
    if (!confirmed) return;
    const end = this._loading.begin();
    try {
      await this.personsSvc.delete(this.id());
      this.personsSvc.triggerRefresh();
      this.alertSvc.showSuccess('Person deleted');
      await this.router.navigate(['/people']);
    } catch (err: any) {
      const message = err?.message || err?.data?.message || 'Unable to delete person';
      this.alertSvc.showError(message);
    } finally {
      end();
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
    return this.usersById().get(String(id))?.first_name ?? '?';
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
