import { Location } from '@angular/common';
import { Component, computed, effect, inject, input, resource, signal, untracked } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { AlertService } from '@uxcommon/components/alerts/alert-service';
import { RecordActivities } from '@experiences/activity/ui/record-activities/record-activities';
import { PeopleInCompany } from './people-in-company';
import { CompaniesService } from '../services/companies-service';
import { UserService } from '../../../services/user.service';
import { PersonsService } from '../../persons/services/persons-service';
import { ConfirmDialogService } from '../../../services/shared-dialog.service';
import { createLoadingGate } from '@uxcommon/loading-gate';
import { StatCard } from '@uxcommon/components/stat-card/stat-card';
import { Tabs, TabPanel, PcTabOption } from '@uxcommon/components/tabs/tabs';
import { ProfileCard } from '@uxcommon/components/profile-card/profile-card';
import { DetailItem } from '@uxcommon/components/detail-item/detail-item';
import { DetailLayout } from '@uxcommon/components/detail-layout/detail-layout';
import type { PcBreadcrumb } from '@uxcommon/components/breadcrumbs/breadcrumbs';
import { SystemMetadata } from '@uxcommon/components/system-metadata/system-metadata';
import { injectRecordNavigation } from '@frontend/services/record-navigation.service';
import { getUserErrorMessage } from '@frontend/services/api/user-message';

@Component({
  selector: 'pc-company-view',
  imports: [
    RouterModule,
    PeopleInCompany,
    RecordActivities,
    DetailLayout,
    StatCard,
    Tabs,
    TabPanel,
    ProfileCard,
    DetailItem,
    SystemMetadata,
  ],
  templateUrl: './company-view.html',
})
export class CompanyView {
  readonly id = input.required<string>();

  protected readonly recordNav = injectRecordNavigation('company', this.id);

  private readonly alertSvc = inject(AlertService);
  private readonly companiesSvc = inject(CompaniesService);
  private readonly personsSvc = inject(PersonsService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly userService = inject(UserService);
  private readonly dialogs = inject(ConfirmDialogService);

  private readonly _loading = createLoadingGate();
  protected readonly isLoading = this._loading.visible;
  protected readonly initialized = signal(false);

  protected readonly company = signal<any | null>(null);
  protected readonly employeeCount = signal(0);

  protected readonly crumbs = computed<PcBreadcrumb[]>(() => [
    { label: 'Companies', route: '/companies' },
    { label: this.company()?.name || 'Company' },
  ]);

  private readonly usersResource = resource({
    loader: () => this.userService.getUsers(),
  });
  private readonly usersById = computed(() => new Map((this.usersResource.value() ?? []).map((x) => [x.id, x])));

  // Active tab state
  protected activeTab = signal<string>('activity');

  protected readonly companyTabs = computed<PcTabOption[]>(() => [
    { id: 'activity', label: 'Activity Feed', icon: 'adjustments-horizontal' },
    { id: 'employees', label: `Employees (${this.employeeCount()})`, icon: 'user-group' },
    { id: 'details', label: 'Description & Info', icon: 'information-circle' },
  ]);

  protected readonly initials = computed(() => {
    const name = this.company()?.name || '';
    if (!name) return '?';
    return name
      .split(' ')
      .slice(0, 2)
      .map((w: string) => w[0] ?? '')
      .join('')
      .toUpperCase();
  });

  protected readonly isEnriched = computed(() => {
    const rawEnrichment = this.company()?.enrichment;
    if (!rawEnrichment) return false;

    let enrichment = null;

    try {
      enrichment = typeof rawEnrichment === 'string' ? JSON.parse(rawEnrichment) : rawEnrichment;
    } catch {
      return false;
    }
    return !!enrichment.google_enriched;
  });

  constructor() {
    effect(() => {
      const currentId = this.id();
      void untracked(() => this.loadAllData(currentId));
    });
  }

  protected async loadAllData(id: string) {
    const end = this._loading.begin();
    try {
      // 1. Load company details (triggers Google enrichment job on backend)
      const data = await this.companiesSvc.getById(id);
      this.company.set(data);
      // Spec §1: the address bar shows the record slug, never the internal id.
      // Cosmetic swap only — route param, record-nav pager and breadcrumbs keep the numeric id.
      if (typeof data?.slug === 'string' && data.slug.length > 0) {
        this.location.replaceState(`/companies/${data.slug}`);
      }

      // 2. Load employee count via dedicated count endpoint (no row data fetched)
      const count = await this.personsSvc.countByCompanyId(id);
      this.employeeCount.set(count);
    } catch (err) {
      this.alertSvc.showError(getUserErrorMessage(err, 'Could not load the company. Please try again.'));
    } finally {
      end();
      this.initialized.set(true);
    }
  }

  protected editCompany() {
    void this.router.navigate(['edit'], { relativeTo: this.route });
  }

  protected async deleteCompany() {
    if (!this.id()) return;
    const confirmed = await this.dialogs.confirm({
      title: 'Delete Company',
      message: 'Are you sure you want to delete this company? This action cannot be undone.',
      variant: 'danger',
      confirmText: 'Delete',
    });
    if (!confirmed) return;
    const end = this._loading.begin();
    try {
      await this.companiesSvc.delete(this.id());
      this.companiesSvc.triggerRefresh();
      this.alertSvc.showSuccess('Company deleted');
      await this.router.navigate(['/companies']);
    } catch (err) {
      const message =
        err instanceof Error && err.message
          ? err.message
          : isRecord(err) &&
              isRecord(err['data']) &&
              typeof err['data']['message'] === 'string' &&
              err['data']['message']
            ? err['data']['message']
            : 'Unable to delete company';
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
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
