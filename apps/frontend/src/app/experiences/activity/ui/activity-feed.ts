import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivityService } from '../services/activity.service';
import { AlertService } from '@uxcommon/components/alerts/alert-service';
import { Icon } from '@icons/icon';
import { PcIconNameType } from '../../../uxcommon/components/icons/icons.index';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'pc-activity-feed',
  imports: [CommonModule, Icon],
  template: `
    <div class="p-6 max-w-4xl mx-auto">
      <!-- Header -->
      <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h1 class="text-2xl font-bold tracking-tight text-base-content flex items-center gap-2">
            <pc-icon name="clipboard-document-list" class="text-primary" [size]="7"></pc-icon>
            User Activity Feed
          </h1>
          <p class="text-sm text-base-content/60 mt-1">
            Real-time audit log of changes made to contacts, tasks, and system settings.
          </p>
        </div>
        <button class="btn btn-outline btn-sm gap-2" (click)="refreshFeed()">
          <pc-icon name="arrow-path" [size]="4"></pc-icon>
          Refresh Feed
        </button>
      </div>

      <!-- Loading State -->
      <div *ngIf="isLoading() && activities().length === 0" class="flex flex-col items-center justify-center py-20">
        <span class="loading loading-spinner loading-lg text-primary"></span>
        <p class="text-base-content/60 mt-4">Loading system logs...</p>
      </div>

      <!-- Empty State -->
      <div *ngIf="!isLoading() && activities().length === 0" class="card bg-base-100 border border-base-300 shadow-xl max-w-md mx-auto mt-10">
        <div class="card-body items-center text-center py-12">
          <pc-icon name="information-circle" class="text-base-content/30 mb-2" [size]="10"></pc-icon>
          <h2 class="card-title text-base-content/70">No activity logged</h2>
          <p class="text-sm text-base-content/50 mt-1">
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
                      <span class="badge badge-outline badge-sm text-[10px] capitalize ml-1.5">{{ act.entity }}</span>
                    </p>
                    <span class="text-[11px] text-base-content/40 whitespace-nowrap">{{ act.created_at | date:'short' }}</span>
                  </div>

                  <!-- Metadata (Optional Details) -->
                  <div *ngIf="hasMetadata(act)" class="mt-2 text-xs bg-base-200/50 p-2.5 rounded-lg border border-base-300 text-base-content/70 font-mono overflow-x-auto">
                    <span *ngIf="act.metadata?.id">Record ID: {{ act.metadata.id }}</span>
                    <span *ngIf="act.metadata?.file_name">File: {{ act.metadata.file_name }}</span>
                    <span *ngIf="act.metadata?.count">Count: {{ act.metadata.count }}</span>
                    <span *ngIf="act.metadata?.target_id">Primary: {{ act.metadata.target_id }} | Duplicate: {{ act.metadata.source_id }}</span>
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
            Load More Activity
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

  protected readonly activities = signal<any[]>([]);
  protected readonly isLoading = signal(false);
  protected readonly hasMore = signal(false);

  private readonly pageSize = 25;
  private currentOffset = 0;

  public ngOnInit() {
    this.refreshFeed();
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
      case 'create': return 'plus';
      case 'update': return 'pencil-square';
      case 'delete': return 'trash';
      case 'merge': return 'merge';
      case 'import': return 'arrow-up-tray';
      case 'export': return 'arrow-down-tray';
      case 'assign': return 'user-plus';
      default: return 'information-circle';
    }
  }

  protected getActivityClass(activity: string): string {
    switch (activity) {
      case 'create': return 'border-success text-success';
      case 'update': return 'border-info text-info';
      case 'delete': return 'border-error text-error';
      case 'merge': return 'border-warning text-warning';
      case 'import': return 'border-secondary text-secondary';
      case 'export': return 'border-primary text-primary';
      case 'assign': return 'border-accent text-accent';
      default: return 'border-base-content/40 text-base-content/60';
    }
  }

  protected getActivityDescription(act: any): string {
    const qty = act.quantity > 1 ? ` (${act.quantity} records)` : '';
    switch (act.activity) {
      case 'create': return `created a new ${act.entity} record${qty}`;
      case 'update': return `updated the ${act.entity} record`;
      case 'delete': return `deleted ${act.entity} record(s)${qty}`;
      case 'merge': return `merged duplicate ${act.entity} records`;
      case 'import': return `imported data into ${act.entity}${qty}`;
      case 'export': return `exported ${act.entity} data${qty}`;
      case 'assign': return `assigned a ${act.entity}`;
      default: return `performed ${act.activity} action on ${act.entity}`;
    }
  }

  protected hasMetadata(act: any): boolean {
    if (!act.metadata) return false;
    return Object.keys(act.metadata).length > 0;
  }
}
