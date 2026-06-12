import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { AlertService } from '@uxcommon/components/alerts/alert-service';
import { Icon } from '@icons/icon';
import { RecordActivities } from '@uxcommon/components/record-activities/record-activities';
import { VolunteerEventsFrontendService } from '../services/volunteer-events-frontend-service';
import { VolunteerService } from '../../../services/api/volunteer-service';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'pc-event-view',
  imports: [DatePipe, RouterModule, Icon, RecordActivities],
  template: `
    <div class="flex min-h-full flex-col bg-base-200/50 p-6">
      <div class="max-w-7xl mx-auto w-full flex flex-col gap-6">
        <!-- Top Navigation Bar & Action Button -->
        <div class="flex items-center justify-between border-b border-base-300 pb-4">
          <div class="flex items-center gap-3">
            <a routerLink="/schedule" class="btn btn-sm btn-ghost gap-1">
              <pc-icon name="arrow-left" [size]="4"></pc-icon>
              Back to Schedule
            </a>
          </div>
          <div class="flex items-center gap-2">
            <a [routerLink]="['edit']" class="btn btn-primary btn-sm gap-2">
              <pc-icon name="pencil-square" [size]="4"></pc-icon>
              EDIT EVENT
            </a>
          </div>
        </div>

        @if (isLoading()) {
          <div class="flex justify-center items-center py-20">
            <progress class="progress w-56"></progress>
          </div>
        } @else if (event()) {
          <!-- Main Content Grid -->
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <!-- Left Column: Event Card -->
            <div class="lg:col-span-1 flex flex-col gap-6">
              <!-- Elegant Event Details Card -->
              <div class="card bg-base-100 shadow-xl overflow-hidden border border-base-300">
                <!-- Decorative Card Header Gradient -->
                <div class="h-24 bg-gradient-to-r from-primary/20 via-primary/30 to-secondary/20"></div>

                <div class="px-6 pb-6 relative flex flex-col items-center">
                  <!-- Event Icon Avatar -->
                  <div class="avatar placeholder -mt-12 mb-3">
                    <div
                      class="bg-gradient-to-tr from-primary to-secondary text-primary-content rounded-full w-24 h-24 ring ring-base-100 ring-offset-4 text-3xl font-bold flex items-center justify-center shadow-lg"
                    >
                      <pc-icon name="clock" [size]="10"></pc-icon>
                    </div>
                  </div>

                  <!-- Name & Status -->
                  <h2 class="text-xl font-bold text-base-content text-center mb-1 leading-tight">{{ event().name }}</h2>
                  <div class="flex gap-2 mb-4">
                    @if (event().is_private) {
                      <span class="badge badge-warning font-semibold uppercase text-xs">Private</span>
                    } @else {
                      <span class="badge badge-success font-semibold uppercase text-xs">Public</span>
                    }
                    @if (eventPassed()) {
                      <span class="badge badge-neutral font-semibold uppercase text-xs">Passed</span>
                    } @else {
                      <span class="badge badge-info font-semibold uppercase text-xs">Upcoming</span>
                    }
                  </div>

                  <!-- Details and Settings List -->
                  <div class="w-full flex flex-col gap-3 text-sm border-t border-base-200 pt-4">
                    @if (event().description) {
                      <div class="p-3 bg-base-200/30 rounded-lg text-xs text-base-content/70">
                        {{ event().description }}
                      </div>
                    }

                    <div class="flex items-start gap-2 p-2 rounded-lg bg-base-200/50 text-base-content/85">
                      <pc-icon name="map-pin" [size]="4" class="text-error shrink-0 mt-0.5"></pc-icon>
                      <span class="text-xs">
                        <strong>Location:</strong> {{ event().location_address || 'No Address Provided' }}
                      </span>
                    </div>

                    <div class="flex items-start gap-2 p-2 rounded-lg bg-base-200/50 text-base-content/85">
                      <pc-icon name="calendar" [size]="4" class="text-info shrink-0 mt-0.5"></pc-icon>
                      <div class="text-xs flex flex-col">
                        <span><strong>Start:</strong> {{ event().start_time | date: 'medium' }}</span>
                        <span><strong>End:</strong> {{ event().end_time | date: 'medium' }}</span>
                      </div>
                    </div>

                    @if (event().contact_email || event().contact_phone) {
                      <div class="divider my-1"></div>
                      <div class="text-xs font-semibold text-base-content/65 uppercase tracking-wider px-1">
                        Coordinator Contact
                      </div>
                      @if (event().contact_email) {
                        <div
                          class="flex items-center justify-between p-2 rounded-lg bg-base-200/50 text-base-content/85"
                        >
                          <div class="flex items-center gap-2">
                            <pc-icon name="envelope" [size]="4" class="text-teal-500"></pc-icon>
                            <span>Email:</span>
                          </div>
                          <span class="font-semibold text-xs">{{ event().contact_email }}</span>
                        </div>
                      }
                      @if (event().contact_phone) {
                        <div
                          class="flex items-center justify-between p-2 rounded-lg bg-base-200/50 text-base-content/85"
                        >
                          <div class="flex items-center gap-2">
                            <pc-icon name="phone" [size]="4" class="text-purple-500"></pc-icon>
                            <span>Phone:</span>
                          </div>
                          <span class="font-semibold text-xs">{{ event().contact_phone }}</span>
                        </div>
                      }
                    }
                  </div>
                </div>
              </div>

              <!-- Public Signup Link Card -->
              @if (event().public_url) {
                <div class="card bg-base-100 shadow-xl border border-base-300 p-6 flex flex-col gap-4">
                  <div class="flex items-center justify-between border-b border-base-200 pb-2">
                    <h3
                      class="text-xs font-bold uppercase tracking-wider text-base-content/70 flex items-center gap-1.5"
                    >
                      <pc-icon name="globe-americas" [size]="4"></pc-icon> Public Signup Link
                    </h3>
                    <button class="btn btn-xs btn-outline btn-primary" (click)="copySnippet()">
                      <pc-icon name="document-duplicate" [size]="3"></pc-icon> Copy
                    </button>
                  </div>

                  <div class="form-control text-xs">
                    <div class="flex gap-2">
                      <input
                        type="text"
                        [value]="publicUrl()"
                        readonly
                        class="input input-bordered input-xs flex-1 font-mono text-[10px]"
                      />
                      <a [href]="publicUrl()" target="_blank" class="btn btn-xs btn-outline btn-secondary px-2">
                        <pc-icon name="arrow-top-right-on-square" [size]="3"></pc-icon>
                      </a>
                    </div>
                  </div>
                </div>
              }
            </div>

            <!-- Right Column: Stats & Tabs -->
            <div class="lg:col-span-2 flex flex-col gap-6">
              <!-- Stats Panel -->
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div class="card bg-base-100 border border-base-300 shadow-md">
                  <div class="card-body p-5 flex flex-row items-center justify-between">
                    <div>
                      <span class="text-xs text-base-content/50 uppercase font-semibold">Signed Up</span>
                      <h3 class="text-2xl font-bold text-indigo-500 mt-1">{{ roster().length }}</h3>
                      <p class="text-[10px] text-base-content/40 mt-0.5">Volunteers scheduled</p>
                    </div>
                    <div class="w-12 h-12 rounded-xl flex items-center justify-center text-indigo-500">
                      <pc-icon name="user-group" [size]="6"></pc-icon>
                    </div>
                  </div>
                </div>

                <div class="card bg-base-100 border border-base-300 shadow-md">
                  <div class="card-body p-5 flex flex-row items-center justify-between">
                    <div>
                      <span class="text-xs text-base-content/50 uppercase font-semibold">Remaining Capacity</span>
                      <h3 class="text-2xl font-bold text-teal-500 mt-1">{{ remainingCapacity() }}</h3>
                      <p class="text-[10px] text-base-content/40 mt-0.5">
                        Total capacity: {{ event().capacity ?? 'Unlimited' }}
                      </p>
                    </div>
                    <div class="w-12 h-12 rounded-xl flex items-center justify-center text-teal-500">
                      <pc-icon name="adjustments-horizontal" [size]="6"></pc-icon>
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
                    [class.tab-active]="activeTab() === 'roster'"
                    (click)="activeTab.set('roster')"
                  >
                    <pc-icon name="user-group" [size]="4" class="flex-shrink-0"></pc-icon>
                    <span>Roster ({{ roster().length }})</span>
                  </a>
                  <a
                    role="tab"
                    class="tab focus:outline-none cursor-pointer inline-flex items-center justify-center gap-1.5"
                    [class.tab-active]="activeTab() === 'activity'"
                    (click)="activeTab.set('activity')"
                  >
                    <pc-icon name="adjustments-horizontal" [size]="4" class="flex-shrink-0"></pc-icon>
                    <span>Activity Feed</span>
                  </a>
                </div>

                <!-- Tab Panels -->
                <div class="p-6">
                  <!-- Panel: Roster List -->
                  @if (activeTab() === 'roster') {
                    <div class="flex flex-col gap-3">
                      @if (roster().length === 0) {
                        <p class="text-sm text-base-content/40 italic">
                          No volunteers signed up for this event roster.
                        </p>
                      } @else {
                        <div class="overflow-x-auto rounded-lg border border-base-300 shadow-sm">
                          <table class="table table-sm table-zebra w-full text-xs">
                            <thead>
                              <tr class="bg-base-200 text-base-content/70">
                                <th>Volunteer</th>
                                <th>Status</th>
                                <th>Hours Worked</th>
                                <th>Notes</th>
                              </tr>
                            </thead>
                            <tbody>
                              @for (shift of roster(); track shift.id) {
                                <tr class="hover:bg-base-200/50">
                                  <td class="font-semibold">
                                    <a
                                      [routerLink]="['/people', shift.person_id]"
                                      class="link hover:underline text-primary font-bold"
                                    >
                                      {{ shift.first_name }} {{ shift.last_name }}
                                    </a>
                                    <div class="text-[10px] text-base-content/50 font-normal mt-0.5">
                                      {{ shift.email || 'No email' }}
                                    </div>
                                  </td>
                                  <td>
                                    <span
                                      class="badge badge-sm font-semibold uppercase"
                                      [class]="getStatusClass(shift.status)"
                                    >
                                      {{ shift.status || 'signed_up' }}
                                    </span>
                                  </td>
                                  <td class="font-mono">
                                    {{
                                      shift.hours_worked !== null && shift.hours_worked !== undefined
                                        ? shift.hours_worked
                                        : '—'
                                    }}
                                  </td>
                                  <td class="max-w-xs truncate" [title]="shift.notes || ''">
                                    {{ shift.notes || '—' }}
                                  </td>
                                </tr>
                              }
                            </tbody>
                          </table>
                        </div>
                      }
                    </div>
                  }

                  <!-- Panel: General Activity Feed -->
                  @if (activeTab() === 'activity') {
                    <div class="flex flex-col gap-4 max-h-[450px] overflow-y-auto pr-1">
                      <pc-record-activities [entity]="'volunteer_events'" [entityId]="id!"></pc-record-activities>
                    </div>
                  }
                </div>
              </div>
            </div>
          </div>
        } @else {
          <div class="alert alert-error">
            <pc-icon name="exclamation-triangle" [size]="6"></pc-icon>
            <span>Event not found or failed to load.</span>
          </div>
        }
      </div>
    </div>
  `,
  providers: [VolunteerService],
})
export class EventViewComponent implements OnInit {
  private readonly alertSvc = inject(AlertService);
  private readonly volunteerEventsSvc = inject(VolunteerEventsFrontendService);
  private readonly volunteerSvc = inject(VolunteerService);
  private readonly route = inject(ActivatedRoute);

  protected id: string | null = null;
  protected readonly isLoading = signal(false);
  protected readonly event = signal<any | null>(null);
  protected readonly roster = signal<any[]>([]);

  // Active tab state
  protected activeTab = signal<'roster' | 'activity'>('roster');

  protected readonly eventPassed = computed(() => {
    const end = this.event()?.end_time;
    if (!end) return false;
    return new Date(end) < new Date();
  });

  protected readonly remainingCapacity = computed(() => {
    const detail = this.event();
    if (!detail || detail.capacity === null || detail.capacity === undefined) {
      return 'Unlimited';
    }
    const count = this.roster().length;
    return Math.max(0, detail.capacity - count);
  });

  protected readonly publicUrl = computed(() => {
    const detail = this.event();
    if (!detail || !detail.public_url) return '';
    return environment.apiUrl + detail.public_url;
  });

  constructor() {
    this.id = this.route.snapshot.paramMap.get('id');
  }

  public ngOnInit() {
    void this.loadAllData();
  }

  protected async loadAllData() {
    if (!this.id) return;
    this.isLoading.set(true);
    try {
      // 1. Load Event details
      const detail = await this.volunteerEventsSvc.getById(this.id);
      this.event.set(detail);

      // 2. Load associated shifts/roster
      const rosterData = await this.volunteerSvc.getShiftsForEvent(this.id);
      this.roster.set(rosterData || []);
    } catch (err) {
      this.alertSvc.showError('Failed to load event details: ' + String(err));
    } finally {
      this.isLoading.set(false);
    }
  }

  protected copySnippet(): void {
    const url = this.publicUrl();
    if (!url) return;
    navigator.clipboard.writeText(url).then(
      () => this.alertSvc.showSuccess('Public signup link copied to clipboard!'),
      () => this.alertSvc.showError('Failed to copy to clipboard.'),
    );
  }

  protected getStatusClass(status: string | null | undefined): string {
    const s = String(status || '').toLowerCase();
    switch (s) {
      case 'attended':
        return 'badge-success text-success-content';
      case 'signed_up':
        return 'badge-warning text-warning-content';
      case 'no_show':
        return 'badge-error text-error-content';
      case 'cancelled':
        return 'badge-neutral text-neutral-content';
      default:
        return 'badge-ghost';
    }
  }
}
