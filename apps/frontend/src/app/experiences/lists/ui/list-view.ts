import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ListsService } from '@experiences/lists/services/lists-service';
import { ListsType, getAllOptionsType } from '@common';
import { AddBtnRow } from '@uxcommon/components/add-btn-row/add-btn-row';
import { AlertService } from '@uxcommon/components/alerts/alert-service';
import { Icon } from '@icons/icon';
import { PersonsService } from '../../persons/services/persons-service';
import { HouseholdsService } from '../../households/services/households-service';

@Component({
  selector: 'pc-list-view',
  imports: [ReactiveFormsModule, AddBtnRow, Icon, RouterLink, CommonModule],
  templateUrl: './list-view.html',
})
export class ListView implements OnInit {
  private readonly alerts = inject(AlertService);
  private readonly fb = inject(FormBuilder);
  private readonly lists = inject(ListsService);
  private readonly route = inject(ActivatedRoute);
  private readonly persons = inject(PersonsService);
  private readonly households = inject(HouseholdsService);

  protected form = this.fb.group({
    name: ['', Validators.required],
    description: [''],
  });
  protected id = signal<string>('');
  protected loading = signal<boolean>(false);
  protected refreshing = signal<boolean>(false);
  protected members = signal<any[]>([]);
  protected object = signal<'people' | 'households' | null>(null);
  protected listData = signal<ListsType | null>(null);
  protected stats = signal<any>(null);
  protected activeTab = signal<'members' | 'newsletters' | 'settings'>('members');

  protected get isPeople() {
    return computed(() => this.object() === 'people');
  }

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

      // Dynamic lists: compute members from saved definition; Static: use mapping
      if (list.is_dynamic && list.definition) {
        const opts = list.definition as getAllOptionsType;
        if (list.object === 'people') {
          const data: any = await this.persons.getAll(opts);
          this.members.set((data.rows ?? data) as any[]);
        } else {
          const data: any = await this.households.getAll(opts);
          this.members.set((data.rows ?? data) as any[]);
        }
      } else {
        if (list.object === 'people') {
          const data = await this.lists.getMembersPersons(id);
          this.members.set(data.rows ?? data);
        } else {
          const data = await this.lists.getMembersHouseholds(id);
          this.members.set(data.rows ?? data);
        }
      }

      // Fetch campaign stats and history
      const statsData = await this.lists.getListStats(id);
      this.stats.set(statsData);
    } catch (e) {
      this.alerts.showError('Failed to load list details');
    } finally {
      this.loading.set(false);
    }
  }

  protected async refreshList() {
    try {
      this.refreshing.set(true);
      await this.lists.refreshList(this.id());
      this.alerts.showSuccess('List refreshed successfully');
      await this.loadListDetails();
    } catch (e: any) {
      this.alerts.showError(e?.message ?? String(e));
    } finally {
      this.refreshing.set(false);
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
