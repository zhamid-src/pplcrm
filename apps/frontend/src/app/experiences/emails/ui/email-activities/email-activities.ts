import { DatePipe } from '@angular/common';
import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { Icon } from '@icons/icon';
import { PcIconNameType } from '@icons/icons.index';

import { EmailsStore } from '../../services/store/emailstore';
import type { EmailType } from '../../../../../../../../libs/common/src/lib/models';

@Component({
  selector: 'pc-email-activities',
  imports: [DatePipe, Icon],
  templateUrl: './email-activities.html',
})
export class EmailActivities {
  private readonly store = inject(EmailsStore);

  public email = input<EmailType | null>(null);
  /** When true, render just the timeline (no toggle bar) — the parent owns the quiet tab row (§5). */
  public readonly headerless = input<boolean>(false);

  protected readonly expanded = signal(false);
  protected readonly isLoading = signal(false);
  private loaded = false;

  constructor() {
    // In headerless mode the parent decides when we're shown, so load eagerly.
    effect(() => {
      if (this.headerless() && this.email() && !this.loaded) {
        void this.loadActivities();
      }
    });
  }

  protected readonly activities = computed<any[]>(() => {
    const em = this.email();
    if (!em) return [];
    return this.store.getEmailActivitiesById(em.id)() ?? [];
  });

  protected readonly activityCount = computed(() => this.activities().length);

  public toggle(): void {
    const wasExpanded = this.expanded();
    this.expanded.set(!wasExpanded);
    if (!wasExpanded && !this.loaded) {
      void this.loadActivities();
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
      case 'assign':
        return 'bg-blue-100 text-blue-600';
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
