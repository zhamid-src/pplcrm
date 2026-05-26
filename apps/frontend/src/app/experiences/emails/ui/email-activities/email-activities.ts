/**
 * @file Component that shows the activity log for an email.
 * Displays events like assignments, status changes, and reopens.
 * Collapsed by default; loads data lazily when first expanded.
 */
import { DatePipe } from '@angular/common';
import { Component, computed, inject, input, signal } from '@angular/core';
import { Icon } from '@icons/icon';
import { PcIconNameType } from '@icons/icons.index';

import { EmailsStore } from '../../services/store/emailstore';
import type { EmailType } from 'common/src/lib/models';

@Component({
  selector: 'pc-email-activities',
  imports: [DatePipe, Icon],
  template: `
    <div class="min-h-0 flex flex-col rounded-lg bg-white border border-gray-200 overflow-hidden">
      <!-- Collapsed header / toggle -->
      <button
        type="button"
        id="email-activities-toggle"
        class="flex items-center justify-between px-3 py-2 text-left text-sm font-medium bg-gray-50 border-b border-gray-200 hover:bg-gray-100 transition-colors"
        (click)="toggle()"
        [attr.aria-expanded]="expanded()"
        aria-controls="activities-panel"
        i18n-aria-label="@@emailActivities.toggleButton.ariaLabel"
        aria-label="Toggle activity log"
      >
        <span class="flex items-center gap-2">
          <pc-icon name="clock" [size]="4" class="text-gray-500"></pc-icon>
          <span i18n="Email activity panel section heading|Label shown on the collapsed activity toggle button@@emailActivities.heading">Activity</span>
          @if (activityCount() > 0) {
            <span
              class="inline-flex items-center justify-center rounded-full bg-gray-200 px-2 py-0.5 text-xs font-medium text-gray-700"
              i18n-aria-label="@@emailActivities.count.ariaLabel"
              [attr.aria-label]="activityCount() + ' activities'"
            >
              {{ activityCount() }}
            </span>
          }
        </span>
        <span class="cursor-pointer ml-2 text-xs text-gray-500">
          @if (expanded()) {
            <ng-container i18n="Email activity panel|Label to collapse the activity panel@@emailActivities.toggle.hide">Hide</ng-container>
          } @else {
            <ng-container i18n="Email activity panel|Label to expand the activity panel@@emailActivities.toggle.show">Show</ng-container>
          }
        </span>
      </button>

      @if (expanded()) {
        <div id="activities-panel" class="overflow-auto email-scrollbar max-h-72">
          @if (isLoading()) {
            <div class="flex items-center justify-center py-6">
              <span
                class="loading loading-spinner loading-sm text-gray-400"
                i18n-aria-label="@@emailActivities.loading.ariaLabel"
                aria-label="Loading activities"
              ></span>
            </div>
          } @else if (activities().length === 0) {
            <div class="flex flex-col items-center justify-center py-6 gap-1 text-gray-400">
              <pc-icon name="information-circle" [size]="5"></pc-icon>
              <span class="text-xs" i18n="Email activity panel empty state|Message shown when there are no activity events yet@@emailActivities.emptyState">No activity recorded yet</span>
            </div>
          } @else {
            <ol
              class="relative border-l border-gray-200 ml-4 py-3 pr-3 space-y-3"
              i18n-aria-label="@@emailActivities.list.ariaLabel"
              aria-label="Email activity timeline"
            >
              @for (act of activities(); track act.id) {
                <li class="ml-4">
                  <!-- Timeline dot -->
                  <span
                    class="absolute -left-[9px] flex h-4 w-4 items-center justify-center rounded-full ring-4 ring-white"
                    [class]="getActivityDotClass(act.activity)"
                  >
                    <pc-icon [name]="getActivityIcon(act.activity)" [size]="3"></pc-icon>
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
export class EmailActivities {
  private readonly store = inject(EmailsStore);

  /** Email whose activity log to display */
  public email = input<EmailType | null>(null);

  protected readonly expanded = signal(false);
  protected readonly isLoading = signal(false);
  private loaded = false;

  /** Activities come from the reactive cache */
  protected readonly activities = computed<any[]>(() => {
    const em = this.email();
    if (!em) return [];
    return this.store.getEmailActivitiesById(em.id)() ?? [];
  });

  protected readonly activityCount = computed(() => this.activities().length);

  /** Toggle expanded state; lazy-load on first open */
  public toggle(): void {
    const wasExpanded = this.expanded();
    this.expanded.set(!wasExpanded);
    if (!wasExpanded && !this.loaded) {
      this.loadActivities();
    }
  }

  private async loadActivities(): Promise<void> {
    const em = this.email();
    if (!em) return;
    this.isLoading.set(true);
    try {
      await this.store.loadEmailActivities(em.id);
      this.loaded = true;
    } catch (e) {
      console.error('Failed to load email activities', e);
    } finally {
      this.isLoading.set(false);
    }
  }

  protected getActivityIcon(activity: string): PcIconNameType {
    switch (activity) {
      case 'assign':   return 'user-plus';
      case 'unassign': return 'user-circle';
      case 'close':    return 'check-circle';
      case 'reopen':   return 'arrow-path';
      default:         return 'information-circle';
    }
  }

  protected getActivityDotClass(activity: string): string {
    switch (activity) {
      case 'assign':   return 'bg-blue-100 text-blue-600';
      case 'unassign': return 'bg-gray-100 text-gray-500';
      case 'close':    return 'bg-green-100 text-green-600';
      case 'reopen':   return 'bg-amber-100 text-amber-600';
      default:         return 'bg-gray-100 text-gray-400';
    }
  }

  protected getActivityLabel(act: any): string {
    const meta = act.metadata ?? {};
    switch (act.activity) {
      case 'assign': {
        const name = meta['assigned_to_name'] ?? 'someone';
        return `assigned this email to ${name}`;
      }
      case 'unassign':
        return 'unassigned this email';
      case 'close':
        return 'closed this email';
      case 'reopen':
        return 'reopened this email';
      default:
        return `performed ${act.activity} on this email`;
    }
  }
}
