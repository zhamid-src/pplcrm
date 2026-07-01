import { DatePipe } from '@angular/common';
import { Component, computed, effect, inject, input, resource, signal, untracked, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import type { AddressType, Households } from '../../../../../../../libs/common/src/lib/kysely.models';
import { AlertService } from '@uxcommon/components/alerts/alert-service';
import { Icon } from '@uxcommon/components/icons/icon';
import { RecordActivities } from '@experiences/activity/ui/record-activities/record-activities';
import { PeopleInHousehold } from './people-in-household';
import { UserService } from '../../../services/user.service';
import { HouseholdsService } from '../../households/services/households-service';
import { PersonsService } from '../services/persons-service';
import { VolunteerService } from '../../../services/api/volunteer-service';
import { DonationsService } from '../../../services/api/donations-service';
import { EventsService } from '../../../services/api/events-service';
import { ConnectionsService } from '../../../services/api/connections-service';
import { PersonConnections } from './person-connections';
import { ConfirmDialogService } from '../../../services/shared-dialog.service';
import { createLoadingGate } from '@uxcommon/loading-gate';
import { Card as PcCard } from '@uxcommon/components/card/card';
import { Tabs, TabPanel, PcTabOption } from '@uxcommon/components/tabs/tabs';
import { StatusBadge } from '@uxcommon/components/status-badge/status-badge';
import { StatCard } from '@uxcommon/components/stat-card/stat-card';
import { ProfileCard } from '@uxcommon/components/profile-card/profile-card';
import { DetailLayout } from '@uxcommon/components/detail-layout/detail-layout';
import { DetailItem } from '@uxcommon/components/detail-item/detail-item';
import { SystemMetadata } from '@uxcommon/components/system-metadata/system-metadata';
import { Tags } from '@experiences/tags/ui/tags';
import { PcIconNameType } from '@icons/icons.index';

interface SocialLinkDef {
  name: string;
  url: string | null | undefined;
  icon: PcIconNameType;
  color: string;
}

@Component({
  selector: 'pc-person-view',
  imports: [
    DatePipe,
    RouterModule,
    FormsModule,
    PeopleInHousehold,
    Icon,
    RecordActivities,
    DetailLayout,
    PcCard,
    Tabs,
    TabPanel,
    StatusBadge,
    StatCard,
    ProfileCard,
    DetailItem,
    SystemMetadata,
    Tags,
    PersonConnections,
  ],
  templateUrl: './person-view.html',
})
export class PersonView implements OnInit {
  readonly id = input.required<string>();

  private readonly alertSvc = inject(AlertService);
  private readonly userService = inject(UserService);
  private readonly householdsSvc = inject(HouseholdsService);
  private readonly personsSvc = inject(PersonsService);
  protected readonly donationsSvc = inject(DonationsService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly dialogs = inject(ConfirmDialogService);
  private readonly volunteerSvc = inject(VolunteerService);
  private readonly eventsSvc = inject(EventsService);
  private readonly connectionsSvc = inject(ConnectionsService);

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
  protected readonly donationStats = signal<{
    cumulativeAmount: number;
    limitAmount: number;
    remainingAmount: number;
  } | null>(null);
  protected readonly donationHistory = signal<any[]>([]);
  protected readonly eventHistory = signal<any[]>([]);
  protected readonly eventStats = signal<{ events_count: number } | null>(null);
  protected readonly connectionCount = signal(0);
  protected readonly activityData = signal<{ emails: any[]; newsletters: any[] }>({ emails: [], newsletters: [] });
  protected readonly openedNewslettersCount = computed(() => {
    return this.activityData().newsletters.filter((n: any) => n.event_type === 'open' || n.event_type === 'click')
      .length;
  });
  protected readonly tags = signal<string[]>([]);
  protected readonly issues = signal<string[]>([]);

  // Donation Dialog State
  protected readonly isCheckingEligibility = signal(false);
  protected readonly donationAmount = signal<number | null>(null);
  protected readonly showDonationModal = signal(false);
  protected readonly eligibilityError = signal<string | null>(null);

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
    const hh = this.householdResource.value() as Households | null | undefined;
    if (!hh || hh.is_placeholder) return 'No Address Assigned';
    return this.getFormattedAddress(hh);
  });
  protected readonly isPlaceholderHousehold = computed(() => {
    return (this.householdResource.value() as Households | null | undefined)?.is_placeholder ?? false;
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

  // Social icons
  public socialLinks = computed<SocialLinkDef[]>(() => {
    const p = this.person();
    return [
      {
        name: 'LinkedIn',
        url: p.linkedin,
        icon: 'linkedin',
        color: 'bg-[#0a66c2]', // LinkedIn Blue
      },
      {
        name: 'X',
        url: p.twitter,
        icon: 'x',
        color: 'bg-black', // X Black
      },
      {
        name: 'Facebook',
        url: p.facebook,
        icon: 'facebook',
        color: 'bg-[#1877f2]', // Facebook Blue
      },
      {
        name: 'Instagram',
        url: p.instagram,
        icon: 'instagram',
        color: 'bg-[#e1306c]', // Instagram Pink/Red
      },
    ];
  });

  // Active tab state
  protected activeTab = signal<string>('activity');

  protected readonly personTabs = computed<PcTabOption[]>(() => [
    { id: 'activity', label: 'Activity Feed', icon: 'adjustments-horizontal' },
    { id: 'emails', label: 'Conversations', icon: 'envelope', badge: this.activityData()?.emails?.length },
    { id: 'newsletters', label: 'Newsletters', icon: 'megaphone', badge: this.activityData()?.newsletters?.length },
    { id: 'volunteer', label: 'Shift Logs', icon: 'volunteer', badge: this.volunteerHistory()?.length },
    { id: 'donations', label: 'Donations', icon: 'currency-dollar', badge: this.donationHistory()?.length },
    { id: 'events', label: 'Events', icon: 'file-calendar', badge: this.eventHistory()?.length },
    { id: 'connections', label: 'Connections', icon: 'user-group', badge: this.connectionCount() || undefined },
    { id: 'household', label: 'Household', icon: 'home' },
  ]);

  protected getMailStatusType(status: string | null | undefined): any {
    const s = String(status || '').toLowerCase();
    if (s === 'sent' || s === 'delivered') return 'success';
    if (s === 'opened') return 'info';
    if (s === 'read') return 'neutral';
    return 'ghost';
  }

  protected getEmailEventType(eventType: string | null | undefined): any {
    const et = String(eventType || '').toLowerCase();
    if (et === 'open') return 'success';
    if (et === 'click') return 'warning';
    if (et === 'delivered' || et === 'processed') return 'info';
    if (['bounce', 'dropped', 'spamreport', 'unsubscribe'].includes(et)) return 'error';
    return 'ghost';
  }

  protected getShiftStatusType(status: string | null | undefined): any {
    const s = String(status || '').toLowerCase();
    if (s === 'attended') return 'success';
    if (s === 'signed_up') return 'warning';
    if (s === 'no_show') return 'error';
    return 'ghost';
  }

  protected getEventStatusType(status: string | null | undefined): any {
    const s = String(status || '').toLowerCase();
    if (s === 'attended') return 'success';
    if (s === 'registered') return 'warning';
    if (s === 'no_show') return 'error';
    if (s === 'cancelled') return 'neutral';
    return 'ghost';
  }

  constructor() {
    effect(() => {
      const currentId = this.id();
      untracked(() => this.loadAllData(currentId));
    });
  }

  public ngOnInit() {
    // Standard Angular Init
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

      // 4. Load donations stats and history
      try {
        const stats = await this.donationsSvc.getStats(id);
        this.donationStats.set(stats);
        const history = await this.donationsSvc.getHistory(id);
        this.donationHistory.set(history || []);
      } catch (err) {
        console.error('Failed to load donations history', err);
      }

      // 5. Load event history
      try {
        const stats = await this.eventsSvc.getStatsForPerson(id);
        this.eventStats.set(stats);
        const history = await this.eventsSvc.getHistoryForPerson(id);
        this.eventHistory.set(history || []);
      } catch (err) {
        console.error('Failed to load event history', err);
      }

      // 6. Load connection count (tab badge — full list loads lazily inside the tab)
      try {
        const count = await this.connectionsSvc.countForPerson(id);
        this.connectionCount.set(count);
      } catch (err) {
        console.error('Failed to load connection count', err);
      }

      // Check query params for Stripe Checkout success redirects
      const params = this.route.snapshot.queryParams;
      if (params['checkout_success'] === 'true' && params['session_id']) {
        try {
          await this.donationsSvc.confirmDonation(params['session_id']);
          this.alertSvc.showSuccess('Donation processed successfully! Thank you for your support.');
          // Reload donation stats/history after confirmation
          const stats = await this.donationsSvc.getStats(id);
          this.donationStats.set(stats);
          const history = await this.donationsSvc.getHistory(id);
          this.donationHistory.set(history || []);
          this.router.navigate([], { relativeTo: this.route, queryParams: {}, replaceUrl: true });
        } catch (err) {
          console.error('Failed to confirm stripe checkout session:', err);
          this.alertSvc.showError('Finalizing payment verification...');
        }
      } else if (params['mock_donation_success'] === 'true' && params['session_id']) {
        try {
          const amt = Number(params['amount'] || 0);
          await this.donationsSvc.confirmMockDonation({
            personId: id,
            amountCents: amt * 100,
            sessionId: params['session_id'],
            province: params['province'] || '',
            country: params['country'] || '',
          });
          this.alertSvc.showSuccess('[MOCK] Donation recorded successfully!');
          const stats = await this.donationsSvc.getStats(id);
          this.donationStats.set(stats);
          const history = await this.donationsSvc.getHistory(id);
          this.donationHistory.set(history || []);
          this.router.navigate([], { relativeTo: this.route, queryParams: {}, replaceUrl: true });
        } catch (err) {
          console.error('Failed to record mock donation:', err);
        }
      }

      // 5. Load interactions (emails + newsletters)
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

  protected openCollectDonation() {
    this.donationAmount.set(null);
    this.eligibilityError.set(null);
    this.showDonationModal.set(true);
  }

  protected closeDonationModal() {
    this.showDonationModal.set(false);
  }

  protected async submitDonation() {
    const amt = this.donationAmount();
    if (amt === null || amt <= 0) {
      this.alertSvc.showError('Please specify a valid donation amount.');
      return;
    }

    this.isCheckingEligibility.set(true);
    this.eligibilityError.set(null);

    const hh = this.householdResource.value() as Households | null | undefined;
    const address = {
      country: hh?.country || 'CA',
      state: hh?.state || 'ON',
    };

    try {
      const eligibility = await this.donationsSvc.checkEligibility({
        personId: this.id(),
        amountCents: amt * 100,
        address,
      });

      if (!eligibility.eligible) {
        this.eligibilityError.set(eligibility.reason || 'Donor is ineligible to donate.');
        this.isCheckingEligibility.set(false);
        return;
      }

      this.closeDonationModal();
      this.alertSvc.showSuccess('Redirecting to Stripe Checkout...');

      // Redirect
      const session = await this.donationsSvc.createCheckout({
        personId: this.id(),
        amountCents: amt * 100,
        address,
      });

      if (session && session.url) {
        window.location.href = session.url;
      } else {
        this.alertSvc.showError('Failed to initialize payment gateway.');
      }
    } catch (err: any) {
      this.alertSvc.showError(err.message || 'Verification check failed.');
    } finally {
      this.isCheckingEligibility.set(false);
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
