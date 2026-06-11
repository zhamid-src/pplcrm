import { DatePipe } from '@angular/common';
import { Component, computed, inject, input, signal, effect } from '@angular/core';
import { Icon } from '@icons/icon';
import { PcIconNameType } from '@icons/icons.index';
import { ActivityService } from '../../../experiences/activity/services/activity.service';

@Component({
  selector: 'pc-record-activities',
  imports: [DatePipe, Icon],
  template: `
    <div class="min-h-0 flex flex-col rounded-lg bg-white border border-gray-200 overflow-hidden">
      <!-- Header -->
      <div class="flex items-center justify-between px-3 py-2 text-sm font-medium bg-gray-50 border-b border-gray-200">
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
      </div>

      <div id="activities-panel" class="overflow-auto email-scrollbar max-h-72">
        @if (isLoading()) {
          <div class="flex items-center justify-center py-6">
            <span class="loading loading-spinner loading-sm text-gray-400" aria-label="Loading activities"></span>
          </div>
        } @else if (activities().length === 0) {
          <div class="flex flex-col items-center justify-center py-6 gap-1 text-gray-400">
            <pc-icon name="information-circle" [size]="5"></pc-icon>
            <span class="text-xs">No activity recorded yet</span>
          </div>
        } @else {
          <ol class="relative border-l border-gray-200 ml-4 py-3 pr-3 space-y-3" aria-label="Record activity timeline">
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
                  <time class="text-[10px] text-gray-400 mt-0.5 block" [title]="act.created_at | date: 'medium'">{{
                    act.created_at | date: 'short'
                  }}</time>
                </div>
              </li>
            }
          </ol>
        }
      </div>
    </div>
  `,
})
export class RecordActivities {
  private readonly activitySvc = inject(ActivityService);

  public entity = input.required<string>();
  public entityId = input.required<string>();

  protected readonly isLoading = signal(false);
  protected readonly activities = signal<any[]>([]);

  protected readonly activityCount = computed(() => this.activities().length);

  constructor() {
    effect(
      () => {
        // Access signals to subscribe to updates
        this.entityId();
        this.entity();
        void this.loadActivities();
      },
      { allowSignalWrites: true },
    );
  }

  public async loadActivities(): Promise<void> {
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
      case 'create':
        return 'plus';
      case 'update':
        return 'pencil-square';
      case 'delete':
        return 'trash';
      case 'merge':
        return 'merge';
      case 'import':
        return 'arrow-up-tray';
      case 'export':
        return 'arrow-down-tray';
      case 'assign':
        return 'user-plus';
      case 'unassign':
        return 'user-circle';
      case 'close':
        return 'check-circle';
      case 'reopen':
        return 'arrow-path';
      default:
        return 'information-circle';
    }
  }

  protected getActivityDotClass(activity: string): string {
    switch (activity) {
      case 'create':
        return 'bg-green-100 text-green-600';
      case 'update':
        return 'bg-blue-100 text-blue-600';
      case 'delete':
        return 'bg-red-100 text-red-600';
      case 'merge':
        return 'bg-yellow-100 text-yellow-600';
      case 'import':
        return 'bg-indigo-100 text-indigo-600';
      case 'export':
        return 'bg-purple-100 text-purple-600';
      case 'assign':
        return 'bg-teal-100 text-teal-600';
      case 'unassign':
        return 'bg-gray-100 text-gray-500';
      case 'close':
        return 'bg-green-100 text-green-600';
      case 'reopen':
        return 'bg-amber-100 text-amber-600';
      default:
        return 'bg-gray-100 text-gray-400';
    }
  }

  private formatValue(val: any): string {
    if (val === null || val === undefined || val === '') return 'none';
    if (typeof val === 'boolean') return val ? 'yes' : 'no';
    if (typeof val === 'object') return JSON.stringify(val);
    const str = String(val);
    if (str.length > 40) {
      return `"${str.substring(0, 40)}..."`;
    }
    return `"${str}"`;
  }

  private getChangesSuffix(changes: any): string {
    if (!changes) return '';
    const parts: string[] = [];
    const keys = Object.keys(changes);
    if (keys.length > 0) {
      for (const key of keys) {
        const change = changes[key];
        const fieldName = key.replace(/_/g, ' ');
        const fromVal = this.formatValue(change.from);
        const toVal = this.formatValue(change.to);
        parts.push(`${fieldName} from ${fromVal} to ${toVal}`);
      }
      return ` (changed ${parts.join(', ')})`;
    }
    return '';
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
    else if (entLower === 'teams') ent = 'team';
    else if (entLower === 'workflows') ent = 'workflow';
    else if (entLower === 'lists') ent = 'list';
    else if (entLower === 'web_forms') ent = 'web form';
    else if (entLower === 'volunteer_events') ent = 'volunteer event';

    switch (act.activity) {
      case 'create':
        return `created this ${ent} record`;
      case 'update': {
        if (meta['action'] === 'add_comment') {
          return `added a comment to this ${ent}`;
        }
        if (meta['action'] === 'add_subtask') {
          return `added subtask "${meta['subtask_name']}" to this ${ent}`;
        }
        if (meta['action'] === 'toggle_subtask') {
          return `${meta['status'] === 'done' ? 'completed' : 'reopened'} subtask "${meta['subtask_name']}" on this ${ent}`;
        }
        if (meta['action'] === 'add_attachment') {
          return `attached file "${meta['filename']}" to this ${ent}`;
        }
        if (meta['action'] === 'change_due_date') {
          if (meta['due_at']) {
            const parts = String(meta['due_at']).split('-');
            let formattedDate = String(meta['due_at']);
            if (parts.length === 3) {
              const year = parseInt(parts[0], 10);
              const month = parseInt(parts[1], 10) - 1;
              const day = parseInt(parts[2], 10);
              const dateVal = new Date(year, month, day);
              formattedDate = dateVal.toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              });
            }
            return `changed the due date to ${formattedDate} on this ${ent}`;
          }
          return `removed the due date on this ${ent}`;
        }
        if (meta['action'] === 'attach_tag' || meta['action'] === 'attach_issue') {
          return `attached tag "${meta['name']}" to this ${ent}`;
        }
        if (meta['action'] === 'detach_tag' || meta['action'] === 'detach_issue') {
          return `detached tag "${meta['name']}" from this ${ent}`;
        }
        if (meta['action'] === 'status_update') {
          return `updated the status of this ${ent}`;
        }

        // Household address check
        if (entLower === 'households' || entLower === 'household') {
          const addressFields = [
            'apt',
            'street_num',
            'street1',
            'street2',
            'city',
            'state',
            'zip',
            'country',
            'formatted_address',
          ];
          if (meta.changes && Object.keys(meta.changes).some((k) => addressFields.includes(k))) {
            return `updated the address of this household` + this.getChangesSuffix(meta.changes);
          }
        }
        return `updated this ${ent} record` + this.getChangesSuffix(meta.changes);
      }
      case 'delete':
        return `deleted ${ent} record${qty}`;
      case 'merge':
        return `merged duplicate ${ent} records`;
      case 'import':
        return `imported this ${ent}${qty}`;
      case 'export':
        return `exported ${ent} data${qty}`;
      case 'assign': {
        const assignee = meta['assigned_to_name'] ?? 'someone';
        return `assigned this ${ent} to ${assignee}`;
      }
      case 'unassign':
        return `unassigned this ${ent}`;
      case 'close':
        return `closed this ${ent}`;
      case 'reopen':
        return `reopened this ${ent}`;
      default:
        return `performed ${act.activity} on this ${ent}`;
    }
  }
}
