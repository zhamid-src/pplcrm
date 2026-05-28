import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ActivityService } from '../services/activity.service';
import { AlertService } from '@uxcommon/components/alerts/alert-service';
import { Icon } from '@icons/icon';
import { PcIconNameType } from '../../../uxcommon/components/icons/icons.index';
import { AuthService } from '../../../auth/auth-service';
import { IAuthUser } from '@common';

@Component({
  selector: 'pc-activity-feed',
  imports: [CommonModule, RouterLink, Icon],
  template: `
    <div class="p-6 max-w-4xl mx-auto">
      <!-- Header -->
      <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h1 class="text-2xl font-bold tracking-tight text-base-content flex items-center gap-2">
            <pc-icon name="clipboard-document-list" class="text-primary" [size]="7"></pc-icon>
            <ng-container i18n="Activity feed page|Main heading of the activity feed page@@activityFeed.heading">User Activity Feed</ng-container>
          </h1>
          <p class="text-sm text-base-content/60 mt-1" i18n="Activity feed page|Subtitle describing what the activity feed shows@@activityFeed.subtitle">
            Real-time audit log of changes made to contacts, emails, tasks, and system settings.
          </p>
        </div>
        <button
          class="btn btn-outline btn-sm gap-2"
          (click)="refreshFeed()"
          i18n-title="@@activityFeed.refreshButton.title"
          title="Refresh the activity feed"
        >
          <pc-icon name="arrow-path" [size]="4"></pc-icon>
          <ng-container i18n="Activity feed page|Button label to refresh the activity feed@@activityFeed.refreshButton.label">Refresh Feed</ng-container>
        </button>
      </div>

      <!-- Filters -->
      <div class="card bg-base-100 border border-base-300 shadow-sm mb-6">
        <div class="card-body p-4 flex flex-col md:flex-row gap-4 items-end">
          <!-- Search input -->
          <div class="flex-1 w-full">
            <label class="label py-1"><span class="label-text font-semibold text-xs text-base-content/70">Search Feed</span></label>
            <div class="relative w-full">
              <input
                type="text"
                class="input input-bordered input-sm w-full pl-8"
                placeholder="Search actor, item..."
                [value]="searchStr()"
                (input)="onSearch($event)"
              />
              <span class="absolute left-2.5 top-2.5 text-base-content/40">
                <pc-icon name="magnifying-glass" [size]="4"></pc-icon>
              </span>
            </div>
          </div>

          <!-- User filter -->
          <div class="w-full md:w-44">
            <label class="label py-1"><span class="label-text font-semibold text-xs text-base-content/70">User</span></label>
            <select
              class="select select-bordered select-sm w-full font-medium"
              [value]="selectedUser()"
              (change)="onUserChange($event)"
            >
              <option value="">All Users</option>
              <option *ngFor="let u of users()" [value]="u.id">
                {{ u.first_name }} {{ u.last_name || '' }}
              </option>
            </select>
          </div>

          <!-- Item Type filter -->
          <div class="w-full md:w-44">
            <label class="label py-1"><span class="label-text font-semibold text-xs text-base-content/70">Item Type</span></label>
            <select
              class="select select-bordered select-sm w-full font-medium"
              [value]="selectedEntity()"
              (change)="onEntityChange($event)"
            >
              <option value="">All Items</option>
              <option value="persons">People</option>
              <option value="households">Households</option>
              <option value="tasks">Tasks</option>
              <option value="emails">Emails</option>
              <option value="newsletters">Newsletters</option>
              <option value="web_forms">Forms</option>
              <option value="volunteer_events">Volunteer Events</option>
              <option value="volunteer_shifts">Volunteer Shifts</option>
              <option value="companies">Companies</option>
              <option value="teams">Teams</option>
              <option value="tags">Tags</option>
            </select>
          </div>

          <!-- Action filter -->
          <div class="w-full md:w-44">
            <label class="label py-1"><span class="label-text font-semibold text-xs text-base-content/70">Action</span></label>
            <select
              class="select select-bordered select-sm w-full font-medium"
              [value]="selectedActivity()"
              (change)="onActivityChange($event)"
            >
              <option value="">All Actions</option>
              <option value="create">Create</option>
              <option value="update">Update</option>
              <option value="delete">Delete</option>
              <option value="merge">Merge</option>
              <option value="import">Import</option>
              <option value="export">Export</option>
              <option value="assign">Assign</option>
              <option value="unassign">Unassign</option>
              <option value="close">Close</option>
              <option value="reopen">Reopen</option>
            </select>
          </div>

          <!-- Reset Button -->
          <button
            *ngIf="hasActiveFilters()"
            class="btn btn-ghost btn-sm text-error gap-1 px-2 w-full md:w-auto hover:bg-error/10"
            (click)="clearFilters()"
            title="Clear all filters"
          >
            <pc-icon name="x-mark" [size]="4"></pc-icon>
            Clear
          </button>
        </div>
      </div>

      <!-- Loading State -->
      <div *ngIf="isLoading() && activities().length === 0" class="flex flex-col items-center justify-center py-20">
        <span
          class="loading loading-spinner loading-lg text-primary"
          i18n-aria-label="@@activityFeed.loading.ariaLabel"
          aria-label="Loading activity logs"
        ></span>
        <p class="text-base-content/60 mt-4" i18n="Activity feed loading state|Text shown while the feed is initially loading@@activityFeed.loading.message">Loading system logs...</p>
      </div>

      <!-- Empty State -->
      <div *ngIf="!isLoading() && activities().length === 0" class="card bg-base-100 border border-base-300 shadow-xl max-w-md mx-auto mt-10">
        <div class="card-body items-center text-center py-12">
          <pc-icon name="information-circle" class="text-base-content/30 mb-2" [size]="10"></pc-icon>
          <h2 class="card-title text-base-content/70" i18n="Activity feed empty state|Heading when no activity has been logged yet@@activityFeed.emptyState.heading">No activity logged</h2>
          <p class="text-sm text-base-content/50 mt-1" i18n="Activity feed empty state|Description text when no activity has been logged yet@@activityFeed.emptyState.description">
            Activity logs will appear here once actions are performed in the system.
          </p>
        </div>
      </div>

      <!-- Feed Timeline -->
      <div *ngIf="activities().length > 0" class="space-y-4">
        <div class="relative pl-6 border-l-2 border-base-300 space-y-6">
          <div *ngFor="let act of activities()" class="relative group">
            <!-- Icon Indicator -->
            <div
              class="absolute -left-[37px] top-1.5 w-6 h-6 rounded-full border-2 bg-base-100 flex items-center justify-center transition-all duration-200"
              [ngClass]="getActivityClass(act.activity)"
            >
              <pc-icon [name]="getActivityIcon(act.activity)" [size]="3"></pc-icon>
            </div>

            <!-- Activity Card -->
            <div class="card bg-base-100 border border-base-300 hover:border-primary/20 shadow-md group-hover:shadow-lg transition-all duration-200">
              <div class="card-body p-4 sm:p-5 flex flex-row items-start gap-4">
                <!-- User Avatar -->
                <div class="avatar placeholder hidden sm:flex">
                  <div class="bg-neutral text-neutral-content rounded-full w-10 h-10 text-xs font-semibold">
                    {{ getUserInitials(act) }}
                  </div>
                </div>

                <!-- Event Details -->
                <div class="flex-1 min-w-0">
                  <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                    <p class="text-sm font-medium text-base-content">
                      <span class="font-bold">{{ act.first_name }} {{ act.last_name }}</span>
                      {{ getActivityDescription(act) }}
                      <!-- Entity link -->
                      @if (getEntityLink(act); as link) {
                        <a
                          [routerLink]="link.path"
                          [queryParams]="link.params"
                          class="badge badge-outline badge-sm text-[10px] capitalize ml-1.5 hover:badge-primary cursor-pointer"
                          i18n-title="@@activityFeed.entityLink.title"
                          title="Go to record"
                        >{{ act.entity }}{{ link.label ? ': ' + link.label : '' }}</a>
                      } @else {
                        <span class="badge badge-outline badge-sm text-[10px] capitalize ml-1.5">{{ act.entity }}</span>
                      }
                    </p>
                    <span class="text-[11px] text-base-content/40 whitespace-nowrap">{{ act.created_at | date:'short' }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Load More Button -->
        <div *ngIf="hasMore()" class="flex justify-center pt-4">
          <button
            class="btn btn-outline btn-primary gap-2"
            [disabled]="isLoading()"
            (click)="loadMore()"
          >
            <span *ngIf="isLoading()" class="loading loading-spinner loading-xs"></span>
            <ng-container i18n="Activity feed pagination|Label on the button to load more activity rows@@activityFeed.loadMore.label">Load More Activity</ng-container>
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      min-height: 100%;
    }
  `]
})
export class ActivityFeed implements OnInit {
  private readonly activitySvc = inject(ActivityService);
  private readonly alertSvc = inject(AlertService);
  private readonly authSvc = inject(AuthService);

  protected readonly activities = signal<any[]>([]);
  protected readonly isLoading = signal(false);
  protected readonly hasMore = signal(false);

  protected readonly selectedUser = signal<string>('');
  protected readonly selectedEntity = signal<string>('');
  protected readonly selectedActivity = signal<string>('');
  protected readonly searchStr = signal<string>('');
  protected readonly users = signal<IAuthUser[]>([]);

  private readonly pageSize = 25;
  private currentOffset = 0;
  private searchTimeout: any;

  public ngOnInit() {
    this.loadUsers();
    this.refreshFeed();
  }

  private async loadUsers() {
    try {
      const u = await this.authSvc.getUsers();
      this.users.set(u || []);
    } catch (err) {
      console.error('Failed to load users for filter', err);
    }
  }

  protected async refreshFeed() {
    this.activities.set([]);
    this.currentOffset = 0;
    await this.fetchPage(true);
  }

  protected async loadMore() {
    await this.fetchPage(false);
  }

  private async fetchPage(replace: boolean) {
    this.isLoading.set(true);
    try {
      const res = await this.activitySvc.getFeed({
        startRow: this.currentOffset,
        endRow: this.currentOffset + this.pageSize,
        userId: this.selectedUser() || undefined,
        entity: this.selectedEntity() || undefined,
        activity: this.selectedActivity() || undefined,
        searchStr: this.searchStr() || undefined,
      });

      if (replace) {
        this.activities.set(res.rows || []);
      } else {
        this.activities.update((curr) => [...curr, ...(res.rows || [])]);
      }

      this.currentOffset += (res.rows || []).length;
      this.hasMore.set((res.rows || []).length === this.pageSize);
    } catch (err: any) {
      this.alertSvc.showError('Failed to fetch activity logs');
    } finally {
      this.isLoading.set(false);
    }
  }

  protected getUserInitials(act: any): string {
    const fn = act.first_name || '';
    const ln = act.last_name || '';
    return `${fn.charAt(0)}${ln.charAt(0)}`.toUpperCase() || '?';
  }

  protected getActivityIcon(activity: string): PcIconNameType {
    switch (activity) {
      case 'create':   return 'plus';
      case 'update':   return 'pencil-square';
      case 'delete':   return 'trash';
      case 'merge':    return 'merge';
      case 'import':   return 'arrow-up-tray';
      case 'export':   return 'arrow-down-tray';
      case 'assign':   return 'user-plus';
      case 'unassign': return 'user-circle';
      case 'close':    return 'check-circle';
      case 'reopen':   return 'arrow-path';
      default:         return 'information-circle';
    }
  }

  protected getActivityClass(activity: string): string {
    switch (activity) {
      case 'create':   return 'border-success text-success';
      case 'update':   return 'border-info text-info';
      case 'delete':   return 'border-error text-error';
      case 'merge':    return 'border-warning text-warning';
      case 'import':   return 'border-secondary text-secondary';
      case 'export':   return 'border-primary text-primary';
      case 'assign':   return 'border-accent text-accent';
      case 'unassign': return 'border-base-content/40 text-base-content/60';
      case 'close':    return 'border-success text-success';
      case 'reopen':   return 'border-warning text-warning';
      default:         return 'border-base-content/40 text-base-content/60';
    }
  }

  protected getActivityDescription(act: any): string {
    const qty = act.quantity > 1 ? ` (${act.quantity} records)` : '';
    const meta = act.metadata ?? {};
    switch (act.activity) {
      case 'create':   return `created a new ${act.entity} record${qty}`;
      case 'update':   return `updated the ${act.entity} record`;
      case 'delete':   return `deleted ${act.entity} record(s)${qty}`;
      case 'merge':    return `merged duplicate ${act.entity} records`;
      case 'import':   return `imported data into ${act.entity}${qty}`;
      case 'export':   return `exported ${act.entity} data${qty}`;
      case 'assign': {
        const assignee = meta['assigned_to_name'] ?? 'someone';
        return `assigned ${act.entity} to ${assignee}`;
      }
      case 'unassign': return `unassigned ${act.entity}`;
      case 'close':    return `closed ${act.entity}`;
      case 'reopen':   return `reopened ${act.entity}`;
      default:         return `performed ${act.activity} action on ${act.entity}`;
    }
  }

  /**
   * Returns a router link config for the entity, or null if no link applies.
   */
  protected getEntityLink(act: any): { path: string; params?: Record<string, string>; label?: string } | null {
    const metadata = act.metadata ?? {};
    const id = act.entity_id || metadata.id || metadata.event_id;
    if (!id) return null;

    const entity = act.entity?.toLowerCase();
    switch (entity) {
      case 'email':
      case 'emails':
        // Deep-link to inbox and pre-select the email
        return { path: '/inbox', params: { email: id }, label: undefined };
      case 'person':
      case 'persons':
      case 'contact':
      case 'contacts':
        return { path: `/people/${id}`, label: undefined };
      case 'household':
      case 'households':
        return { path: `/households/${id}`, label: undefined };
      case 'task':
      case 'tasks':
      case 'tasks_archived':
        return { path: `/tasks/${id}`, label: undefined };
      case 'volunteer_events':
      case 'volunteer_event':
      case 'volunteer_shifts':
      case 'volunteer_shift': {
        const eventId = metadata.event_id || id;
        return { path: `/schedule/${eventId}`, label: undefined };
      }
      case 'newsletter':
      case 'newsletters':
        return { path: `/newsletter/${id}`, label: undefined };
      case 'web_forms':
      case 'web_form':
      case 'form':
      case 'forms':
        return { path: `/forms/${id}`, label: undefined };
      case 'company':
      case 'companies':
        return { path: `/companies/${id}`, label: undefined };
      case 'team':
      case 'teams':
        return { path: `/teams/${id}`, label: undefined };
      case 'user':
      case 'users':
        return { path: `/users/${id}`, label: undefined };
      default:
        return null;
    }
  }

  protected onUserChange(event: Event) {
    const val = (event.target as HTMLSelectElement).value;
    this.selectedUser.set(val);
    this.refreshFeed();
  }

  protected onEntityChange(event: Event) {
    const val = (event.target as HTMLSelectElement).value;
    this.selectedEntity.set(val);
    this.refreshFeed();
  }

  protected onActivityChange(event: Event) {
    const val = (event.target as HTMLSelectElement).value;
    this.selectedActivity.set(val);
    this.refreshFeed();
  }

  protected onSearch(event: Event) {
    const val = (event.target as HTMLInputElement).value;
    this.searchStr.set(val);
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }
    this.searchTimeout = setTimeout(() => {
      this.refreshFeed();
    }, 300);
  }

  protected hasActiveFilters(): boolean {
    return !!(this.selectedUser() || this.selectedEntity() || this.selectedActivity() || this.searchStr());
  }

  protected clearFilters() {
    this.selectedUser.set('');
    this.selectedEntity.set('');
    this.selectedActivity.set('');
    this.searchStr.set('');
    this.refreshFeed();
  }
}
