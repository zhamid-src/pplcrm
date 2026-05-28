import { DatePipe, CommonModule } from '@angular/common';
import { Component, computed, inject, input, signal, effect } from '@angular/core';
import { Icon } from '@icons/icon';
import { PcIconNameType } from '@icons/icons.index';
import { ActivityService } from '../../../experiences/activity/services/activity.service';

@Component({
  selector: 'pc-record-activities',
  imports: [CommonModule, DatePipe, Icon],
  template: `
    <div class="min-h-0 flex flex-col rounded-lg bg-white border border-gray-200 overflow-hidden">
      <!-- Collapsed header / toggle -->
      <button
        type="button"
        id="record-activities-toggle"
        class="flex items-center justify-between px-3 py-2 text-left text-sm font-medium bg-gray-50 border-b border-gray-200 hover:bg-gray-100 transition-colors"
        (click)="toggle()"
        [attr.aria-expanded]="expanded()"
        aria-controls="activities-panel"
        aria-label="Toggle activity log"
      >
        <span class="flex items-center gap-2">
          <pc-icon name="clock" [size]="4" class="text-gray-500"></pc-icon>
          <span class="font-semibold text-gray-700">Activity History</span>
          @if (activityCount() > 0) {
            <span
              class="inline-flex items-center justify-center rounded-full bg-gray-200 px-2 py-0.5 text-xs font-medium text-gray-700"
              [attr.aria-label]="activityCount() + ' activities'"
            >
              {{ activityCount() }}
            </span>
          }
        </span>
        <span class="cursor-pointer ml-2 text-xs text-gray-500">
          @if (expanded()) {
            Hide
          } @else {
            Show
          }
        </span>
      </button>

      @if (expanded()) {
        <div id="activities-panel" class="overflow-auto email-scrollbar max-h-72">
          @if (isLoading()) {
            <div class="flex items-center justify-center py-6">
              <span
                class="loading loading-spinner loading-sm text-gray-400"
                aria-label="Loading activities"
              ></span>
            </div>
          } @else if (activities().length === 0) {
            <div class="flex flex-col items-center justify-center py-6 gap-1 text-gray-400">
              <pc-icon name="information-circle" [size]="5"></pc-icon>
              <span class="text-xs">No activity recorded yet</span>
            </div>
          } @else {
            <ol
              class="relative border-l border-gray-200 ml-4 py-3 pr-3 space-y-3"
              aria-label="Record activity timeline"
            >
              @for (act of activities(); track act.id) {
                <li class="ml-4">
                  <!-- Timeline dot -->
                  <span
                    class="absolute -left-[9px] flex h-4 w-4 items-center justify-center rounded-full ring-4 ring-white"
                    [class]="getActivityDotClass(act.activity)"
                  >
                    <pc-icon [name]="getActivityIcon(act.activity)" [size]="2.5"></pc-icon>
                  </span>

                  <!-- Content -->
                  <div class="pl-1">
                    <p class="text-xs text-gray-700 leading-snug">
                      <span class="font-semibold">{{ act.first_name }} {{ act.last_name }}</span>
                      {{ getActivityLabel(act) }}
                    </p>
                    <time
                      class="text-[10px] text-gray-400 mt-0.5 block"
                      [title]="act.created_at | date:'medium'"
                    >{{ act.created_at | date:'short' }}</time>
                  </div>
                </li>
              }
            </ol>
          }
        </div>
      }
    </div>
  `,
})
export class RecordActivities {
  private readonly activitySvc = inject(ActivityService);

  public entity = input.required<string>();
  public entityId = input.required<string>();

  protected readonly expanded = signal(false);
  protected readonly isLoading = signal(false);
  protected readonly activities = signal<any[]>([]);

  protected readonly activityCount = computed(() => this.activities().length);

  constructor() {
    effect(() => {
      // Access signals to subscribe to updates
      this.entityId();
      this.entity();
      const isExpanded = this.expanded();

      if (isExpanded) {
        void this.loadActivities();
      } else {
        this.activities.set([]);
      }
    }, { allowSignalWrites: true });
  }

  public toggle(): void {
    const wasExpanded = this.expanded();
    this.expanded.set(!wasExpanded);
  }

  protected async loadActivities(): Promise<void> {
    const ent = this.entity();
    const id = this.entityId();
    if (!ent || !id) return;
    this.isLoading.set(true);
    try {
      const rows = await this.activitySvc.getActivities(ent, id);
      this.activities.set(rows || []);
    } catch (e) {
      console.error('Failed to load record activities', e);
    } finally {
      this.isLoading.set(false);
    }
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

  protected getActivityDotClass(activity: string): string {
    switch (activity) {
      case 'create':   return 'bg-green-100 text-green-600';
      case 'update':   return 'bg-blue-100 text-blue-600';
      case 'delete':   return 'bg-red-100 text-red-600';
      case 'merge':    return 'bg-yellow-100 text-yellow-600';
      case 'import':   return 'bg-indigo-100 text-indigo-600';
      case 'export':   return 'bg-purple-100 text-purple-600';
      case 'assign':   return 'bg-teal-100 text-teal-600';
      case 'unassign': return 'bg-gray-100 text-gray-500';
      case 'close':    return 'bg-green-100 text-green-600';
      case 'reopen':   return 'bg-amber-100 text-amber-600';
      default:         return 'bg-gray-100 text-gray-400';
    }
  }

  protected getActivityLabel(act: any): string {
    const meta = act.metadata ?? {};
    const qty = act.quantity > 1 ? ` (${act.quantity} records)` : '';
    let ent = act.entity ?? 'record';
    const entLower = ent.toLowerCase();
    if (entLower === 'persons' || entLower === 'people') ent = 'person';
    else if (entLower === 'households') ent = 'household';
    else if (entLower === 'companies') ent = 'company';
    else if (entLower === 'tasks') ent = 'task';

    switch (act.activity) {
      case 'create':   return `created this ${ent} record`;
      case 'update':   return `updated this ${ent} record`;
      case 'delete':   return `deleted ${ent} record${qty}`;
      case 'merge':    return `merged duplicate ${ent} records`;
      case 'import':   return `imported this ${ent}${qty}`;
      case 'export':   return `exported ${ent} data${qty}`;
      case 'assign': {
        const assignee = meta['assigned_to_name'] ?? 'someone';
        return `assigned this ${ent} to ${assignee}`;
      }
      case 'unassign': return `unassigned this ${ent}`;
      case 'close':    return `closed this ${ent}`;
      case 'reopen':   return `reopened this ${ent}`;
      default:         return `performed ${act.activity} on this ${ent}`;
    }
  }
}
