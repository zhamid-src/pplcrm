import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { AlertService } from '@uxcommon/components/alerts/alert-service';
import { Icon } from '@uxcommon/components/icons/icon';
import { RecordActivities } from '@uxcommon/components/record-activities/record-activities';
import { PeopleInCompany } from './people-in-company';
import { CompaniesService } from '../services/companies-service';
import { AuthService } from '../../../auth/auth-service';
import { type IAuthUser } from '@common';
import { PersonsService } from '../../persons/services/persons-service';

@Component({
  selector: 'pc-company-view',
  imports: [DatePipe, RouterModule, PeopleInCompany, Icon, RecordActivities],
  template: `
    <div class="flex min-h-full flex-col bg-base-200/50 p-6">
      <div class="max-w-7xl mx-auto w-full flex flex-col gap-6">
        <!-- Top Navigation Bar & Action Button -->
        <div class="flex items-center justify-between border-b border-base-300 pb-4">
          <div class="flex items-center gap-3">
            <a routerLink="/companies" class="btn btn-sm btn-ghost gap-1">
              <pc-icon name="arrow-left" [size]="4"></pc-icon>
              Back to Companies
            </a>
          </div>
          <div class="flex items-center gap-2">
            <a [routerLink]="['edit']" class="btn btn-primary btn-sm gap-2">
              <pc-icon name="pencil-square" [size]="4"></pc-icon>
              EDIT COMPANY
            </a>
          </div>
        </div>

        @if (isLoading()) {
          <div class="flex justify-center items-center py-20">
            <progress class="progress w-56"></progress>
          </div>
        } @else if (company()) {
          <!-- Main Content Grid -->
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <!-- Left Column: Company Details Card -->
            <div class="lg:col-span-1 flex flex-col gap-6">
              <!-- Elegant Company Card -->
              <div class="card bg-base-100 shadow-xl overflow-hidden border border-base-300">
                <!-- Decorative Card Header Gradient -->
                <div class="h-24 bg-gradient-to-r from-primary/20 via-primary/30 to-secondary/20"></div>

                <div class="px-6 pb-6 relative flex flex-col items-center">
                  <!-- Company Initials Avatar -->
                  <div class="avatar placeholder -mt-12 mb-3">
                    <div
                      class="bg-gradient-to-tr from-primary to-secondary text-primary-content rounded-full w-24 h-24 ring ring-base-100 ring-offset-4 text-3xl font-bold flex items-center justify-center shadow-lg"
                    >
                      {{ initials() }}
                    </div>
                  </div>

                  <!-- Name & Industry -->
                  <h2 class="text-2xl font-bold text-base-content text-center mb-1">{{ company().name }}</h2>
                  @if (company().industry) {
                    <div class="badge badge-lg badge-neutral gap-2 mb-4 font-medium">
                      {{ company().industry }}
                    </div>
                  } @else {
                    <span class="text-xs text-base-content/40 italic mb-4">No industry assigned</span>
                  }

                  <!-- Contact details list -->
                  <div class="w-full flex flex-col gap-3 text-sm border-t border-base-200 pt-4">
                    <!-- Website -->
                    @if (company().website) {
                      <div
                        class="flex items-center justify-between p-2 rounded-lg bg-base-200/50 hover:bg-base-200 transition-colors"
                      >
                        <div class="flex items-center gap-2 overflow-hidden">
                          <pc-icon name="globe-americas" [size]="4" class="text-indigo-500 flex-shrink-0"></pc-icon>
                          <a
                            [href]="company().website"
                            target="_blank"
                            class="truncate font-medium text-primary hover:underline"
                          >
                            {{ company().website }}
                          </a>
                        </div>
                      </div>
                    }

                    <!-- Email -->
                    @if (company().email) {
                      <div
                        class="flex items-center justify-between p-2 rounded-lg bg-base-200/50 hover:bg-base-200 transition-colors"
                      >
                        <div class="flex items-center gap-2 overflow-hidden">
                          <pc-icon name="envelope" [size]="4" class="text-teal-500 flex-shrink-0"></pc-icon>
                          <span class="truncate font-medium text-base-content">{{ company().email }}</span>
                        </div>
                        <button
                          class="btn btn-ghost btn-xs btn-circle text-base-content/50 hover:text-teal-500 tooltip"
                          data-tip="Copy Email"
                          (click)="copyToClipboard(company().email, 'Email')"
                        >
                          <pc-icon name="document-duplicate" [size]="3.5"></pc-icon>
                        </button>
                      </div>
                    }

                    <!-- Phone -->
                    @if (company().phone) {
                      <div
                        class="flex items-center justify-between p-2 rounded-lg bg-base-200/50 hover:bg-base-200 transition-colors"
                      >
                        <div class="flex items-center gap-2">
                          <pc-icon name="identification" [size]="4" class="text-purple-500"></pc-icon>
                          <span class="font-medium text-base-content">{{ company().phone }}</span>
                        </div>
                        <button
                          class="btn btn-ghost btn-xs btn-circle text-base-content/50 hover:text-purple-500 tooltip"
                          data-tip="Copy Phone"
                          (click)="copyToClipboard(company().phone, 'Phone')"
                        >
                          <pc-icon name="document-duplicate" [size]="3.5"></pc-icon>
                        </button>
                      </div>
                    }
                  </div>

                  <!-- Internal Notes (Short summary) -->
                  @if (company().notes) {
                    <div class="w-full mt-4 p-3 rounded-lg border border-base-200 bg-base-50/50">
                      <span class="text-xs font-semibold uppercase tracking-wider text-base-content/60 block mb-1">
                        Internal Notes
                      </span>
                      <p class="text-xs text-base-content/80 font-light whitespace-pre-line leading-relaxed">
                        {{ company().notes }}
                      </p>
                    </div>
                  }

                  <!-- System Metadata -->
                  <div
                    class="w-full mt-6 pt-4 border-t border-base-200 text-[10px] text-base-content/40 flex justify-between leading-normal"
                  >
                    <span
                      >Created by {{ getUserName(company().createdby_id) }} on
                      {{ getCreatedAt() | date: 'M/d/yyyy' }}</span
                    >
                    <span
                      >Updated {{ getUpdatedAt() | date: 'M/d/yyyy' }} by
                      {{ getUserName(company().updatedby_id) }}</span
                    >
                  </div>
                </div>
              </div>
            </div>

            <!-- Right Column: Stats & Tabs -->
            <div class="lg:col-span-2 flex flex-col gap-6">
              <!-- Stats Panel -->
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div class="card bg-base-100 border border-base-300 shadow-md">
                  <div class="card-body p-5 flex flex-row items-center justify-between">
                    <div>
                      <span class="text-xs text-base-content/50 uppercase font-semibold">Employees</span>
                      <h3 class="text-2xl font-bold text-teal-500 mt-1">{{ employeeCount() }}</h3>
                      <p class="text-[10px] text-base-content/40 mt-0.5">Total staff listed</p>
                    </div>
                    <div class="w-12 h-12 rounded-xl flex items-center justify-center text-teal-500">
                      <pc-icon name="user-group" [size]="6"></pc-icon>
                    </div>
                  </div>
                </div>

                <div class="card bg-base-100 border border-base-300 shadow-md">
                  <div class="card-body p-5 flex flex-row items-center justify-between">
                    <div>
                      <span class="text-xs text-base-content/50 uppercase font-semibold">Enriched from Google</span>
                      <h3 class="text-2xl font-bold mt-1" [class]="isEnriched() ? 'text-green-500' : 'text-amber-500'">
                        {{ isEnriched() ? 'Yes' : 'No' }}
                      </h3>
                      <p class="text-[10px] text-base-content/40 mt-0.5">Google Places sync status</p>
                    </div>
                    <div
                      class="w-12 h-12 rounded-xl flex items-center justify-center"
                      [class]="isEnriched() ? 'text-green-500' : 'text-amber-500'"
                    >
                      <pc-icon name="check-circle" [size]="6"></pc-icon>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Tabs Panel -->
              <div class="card bg-base-100 shadow-xl border border-base-300 flex-grow">
                <!-- Tabs Header -->
                <div role="tablist" class="tabs tabs-lifted w-full pt-4 px-4">
                  <a
                    role="tab"
                    class="tab focus:outline-none cursor-pointer inline-flex items-center justify-center gap-1.5"
                    [class.tab-active]="activeTab() === 'activity'"
                    (click)="activeTab.set('activity')"
                  >
                    <pc-icon name="adjustments-horizontal" [size]="4" class="flex-shrink-0"></pc-icon>
                    <span>Activity Feed</span>
                  </a>
                  <a
                    role="tab"
                    class="tab focus:outline-none cursor-pointer inline-flex items-center justify-center gap-1.5"
                    [class.tab-active]="activeTab() === 'employees'"
                    (click)="activeTab.set('employees')"
                  >
                    <pc-icon name="user-group" [size]="4" class="flex-shrink-0"></pc-icon>
                    <span>Employees ({{ employeeCount() }})</span>
                  </a>
                  <a
                    role="tab"
                    class="tab focus:outline-none cursor-pointer inline-flex items-center justify-center gap-1.5"
                    [class.tab-active]="activeTab() === 'details'"
                    (click)="activeTab.set('details')"
                  >
                    <pc-icon name="information-circle" [size]="4" class="flex-shrink-0"></pc-icon>
                    <span>Description & Info</span>
                  </a>
                </div>

                <!-- Tab Panels -->
                <div class="p-6">
                  <!-- Panel: General Activity Feed -->
                  @if (activeTab() === 'activity') {
                    <div class="flex flex-col gap-4 max-h-[450px] overflow-y-auto pr-1">
                      <pc-record-activities [entity]="'companies'" [entityId]="id!"></pc-record-activities>
                    </div>
                  }

                  <!-- Panel: Associated Employees List -->
                  @if (activeTab() === 'employees') {
                    <div class="flex flex-col gap-4">
                      <pc-people-in-company [companyId]="id!"></pc-people-in-company>
                    </div>
                  }

                  <!-- Panel: Description -->
                  @if (activeTab() === 'details') {
                    <div class="flex flex-col gap-4">
                      @if (company().description) {
                        <div class="p-4 rounded-xl border border-base-200 bg-base-50/50">
                          <span class="text-xs font-semibold uppercase tracking-wider text-base-content/60 block mb-2">
                            Company Description
                          </span>
                          <p class="text-sm text-base-content/80 font-light whitespace-pre-line leading-relaxed">
                            {{ company().description }}
                          </p>
                        </div>
                      } @else {
                        <div class="text-center py-10 text-base-content/40 italic">
                          No company description recorded.
                        </div>
                      }
                    </div>
                  }
                </div>
              </div>
            </div>
          </div>
        } @else {
          <div class="alert alert-error">
            <pc-icon name="exclamation-triangle" [size]="6"></pc-icon>
            <span>Company not found or failed to load.</span>
          </div>
        }
      </div>
    </div>
  `,
})
export class CompanyView implements OnInit {
  private readonly alertSvc = inject(AlertService);
  private readonly companiesSvc = inject(CompaniesService);
  private readonly personsSvc = inject(PersonsService);
  private readonly route = inject(ActivatedRoute);
  private readonly auth = inject(AuthService);

  protected id: string | null = null;
  protected readonly isLoading = signal(false);
  protected readonly company = signal<any | null>(null);
  protected readonly employeeCount = signal(0);
  protected readonly users = signal<IAuthUser[]>([]);
  private usersById = new Map<string, IAuthUser>();

  // Active tab state
  protected activeTab = signal<'activity' | 'employees' | 'details'>('activity');

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
    const rawJson = this.company()?.json;
    if (!rawJson) return false;
    const json = typeof rawJson === 'string' ? JSON.parse(rawJson) : rawJson;
    return !!json.google_enriched;
  });

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
      // 1. Load company details (triggers Google enrichment job on backend)
      const data = await this.companiesSvc.getById(this.id);
      this.company.set(data);

      // 2. Compute/Load employee count
      // Query the people count using standard PersonsService byCompanyId
      const allEmployees = await this.personsSvc.getByCompanyId(this.id, { limit: 1000 });
      this.employeeCount.set(allEmployees.length);
    } catch (err) {
      this.alertSvc.showError('Failed to load company details: ' + String(err));
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
    const date = this.company()?.created_at;
    return date ? new Date(date) : null;
  }

  protected getUpdatedAt(): Date | null {
    const date = this.company()?.updated_at;
    return date ? new Date(date) : null;
  }

  protected getUserName(id: string | null | undefined): string {
    if (!id) return '?';
    return this.usersById.get(String(id))?.first_name ?? '?';
  }
}
