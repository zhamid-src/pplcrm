import { Component, OnInit, OnDestroy, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ListsService } from '@experiences/lists/services/lists-service';
import { ListsType } from '@common';
import { AddBtnRow } from '@uxcommon/components/add-btn-row/add-btn-row';
import { AlertService } from '@uxcommon/components/alerts/alert-service';
import { Icon } from '@icons/icon';
import { ConfirmDialogService } from '../../../services/shared-dialog.service';

import { RecordActivities } from '@uxcommon/components/record-activities/record-activities';
import { PersonsGrid } from '@experiences/persons/ui/persons-grid';
import { HouseholdsGrid } from '@experiences/households/ui/households-grid';

@Component({
  selector: 'pc-list-view',
  imports: [
    ReactiveFormsModule,
    AddBtnRow,
    Icon,
    RouterLink,
    CommonModule,
    RecordActivities,
    PersonsGrid,
    HouseholdsGrid,
  ],
  templateUrl: './list-view.html',
})
export class ListView implements OnInit, OnDestroy {
  private readonly alerts = inject(AlertService);
  private readonly fb = inject(FormBuilder);
  private readonly lists = inject(ListsService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly dialogs = inject(ConfirmDialogService);

  protected form = this.fb.group({
    name: ['', Validators.required],
    description: [''],
  });
  protected id = signal<string>('');
  protected loading = signal<boolean>(false);
  protected refreshing = signal<boolean>(false);
  protected memberCount = signal<number>(0);
  protected object = signal<'people' | 'households' | null>(null);
  protected listData = signal<ListsType | null>(null);
  protected stats = signal<any>(null);
  protected activeTab = signal<'members' | 'newsletters' | 'settings'>('members');
  protected isPeople = computed(() => this.object() === 'people');

  public async ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) return;
    this.id.set(id);
    await this.loadListDetails();
  }

  protected async loadListDetails() {
    const id = this.id();
    try {
      this.loading.set(true);

      const list = (await this.lists.getById(id)) as ListsType;
      this.listData.set(list);
      this.object.set(list.object as 'people' | 'households');
      this.form.patchValue({ name: list.name ?? '', description: list.description ?? '' });

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

  protected async save(done: () => void) {
    try {
      const val = this.form.getRawValue();
      await this.lists.update(this.id(), { name: val.name!, description: val.description ?? null });
      this.alerts.showSuccess('Saved');
      done();
      await this.loadListDetails();
    } catch (e) {
      this.alerts.showError('Save failed');
      done();
    }
  }

  protected editList() {
    this.activeTab.set('settings');
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
