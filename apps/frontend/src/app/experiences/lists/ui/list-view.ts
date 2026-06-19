import { Component, OnDestroy, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ListsService } from '@experiences/lists/services/lists-service';
import { ListsType } from '@common';
import { FormActions } from '@uxcommon/components/form-actions/form-actions';
import { AlertService } from '@uxcommon/components/alerts/alert-service';
import { Icon } from '@icons/icon';
import { ConfirmDialogService } from '../../../services/shared-dialog.service';

import { RecordActivities } from '@experiences/activity/ui/record-activities/record-activities';
import { PersonsGrid } from '@experiences/persons/ui/persons-grid';
import { HouseholdsGrid } from '@experiences/households/ui/households-grid';

@Component({
  selector: 'pc-list-view',
  imports: [FormActions, Icon, RouterLink, RecordActivities, PersonsGrid, HouseholdsGrid],
  templateUrl: './list-view.html',
})
export class ListView implements OnDestroy {
  readonly id = input.required<string>();

  private readonly alerts = inject(AlertService);
  private readonly lists = inject(ListsService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly dialogs = inject(ConfirmDialogService);
  protected loading = signal<boolean>(false);
  protected refreshing = signal<boolean>(false);
  protected memberCount = signal<number>(0);
  protected object = signal<'people' | 'households' | null>(null);
  protected listData = signal<ListsType | null>(null);
  protected stats = signal<any>(null);
  protected activeTab = signal<'members' | 'newsletters'>('members');
  protected isPeople = computed(() => this.object() === 'people');

  constructor() {
    effect(() => {
      const currentId = this.id();
      untracked(() => {
        if (currentId) void this.loadListDetails();
      });
    });
  }

  protected async loadListDetails(id = this.id()) {
    try {
      this.loading.set(true);

      const list = (await this.lists.getById(id)) as ListsType;
      this.listData.set(list);
      this.object.set(list.object as 'people' | 'households');

      // Fetch list membership count efficiently
      const count = await this.lists.getMemberCount(id);
      this.memberCount.set(count);

      // Fetch campaign stats and history
      const statsData = await this.lists.getListStats(id);
      this.stats.set(statsData);
    } catch (e) {
      this.alerts.showError('Failed to load list details');
    } finally {
      this.loading.set(false);
    }
  }

  private pollInterval: any = null;

  protected async refreshList() {
    try {
      this.refreshing.set(true);
      await this.lists.refreshList(this.id());
      this.alerts.showSuccess('Refresh job scheduled in background');
      this.pollRefreshStatus();
    } catch (e: any) {
      this.alerts.showError(e?.message ?? String(e));
      this.refreshing.set(false);
    }
  }

  private pollRefreshStatus() {
    if (this.pollInterval) clearInterval(this.pollInterval);

    this.pollInterval = setInterval(async () => {
      try {
        const list = (await this.lists.getById(this.id())) as ListsType;
        this.listData.set(list);
        if (list.status !== 'refreshing') {
          clearInterval(this.pollInterval);
          this.pollInterval = null;
          this.refreshing.set(false);
          if (list.status === 'failed') {
            this.alerts.showError('List refresh failed in background');
          } else {
            this.alerts.showSuccess('List refreshed successfully');
          }
          await this.loadListDetails();
        }
      } catch (e) {
        clearInterval(this.pollInterval);
        this.pollInterval = null;
        this.refreshing.set(false);
      }
    }, 1500);
  }

  public ngOnDestroy() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
    }
  }

  protected editList() {
    this.router.navigate(['edit'], { relativeTo: this.route });
  }

  protected async deleteList() {
    if (!this.id()) return;
    const confirmed = await this.dialogs.confirm({
      title: 'Delete List',
      message: 'Are you sure you want to delete this list? This action cannot be undone.',
      variant: 'danger',
      confirmText: 'Delete',
    });
    if (!confirmed) return;
    this.loading.set(true);
    try {
      await this.lists.delete(this.id());
      this.lists.triggerRefresh();
      this.alerts.showSuccess('List deleted');
      await this.router.navigate(['/lists']);
    } catch (err: any) {
      const message = err?.message || err?.data?.message || 'Unable to delete list';
      this.alerts.showError(message);
    } finally {
      this.loading.set(false);
    }
  }

  protected formatDate(value: Date | string | null | undefined): string {
    if (!value) return '—';
    const date = value instanceof Date ? value : new Date(value);
    if (isNaN(date.getTime())) return '—';
    return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
  }

  protected formatPercent(value: number | null | undefined): string {
    if (value == null) return '0%';
    return `${value.toFixed(1)}%`;
  }
}
