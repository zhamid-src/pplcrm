import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ListsService } from '@experiences/lists/services/lists-service';
import { ListsType } from '@common';
import { AddBtnRow } from '@uxcommon/components/add-btn-row/add-btn-row';
import { AlertService } from '@uxcommon/components/alerts/alert-service';
import { FormInput } from '@uxcommon/components/form-input/formInput';

@Component({
  selector: 'pc-list-view',
  imports: [ReactiveFormsModule, FormInput, AddBtnRow],
  templateUrl: './list-view.html',
})
export class ListView implements OnInit {
  private readonly alerts = inject(AlertService);
  private readonly fb = inject(FormBuilder);
  private readonly lists = inject(ListsService);
  private readonly route = inject(ActivatedRoute);

  protected form = this.fb.group({
    name: ['', Validators.required],
    description: [''],
  });
  protected id = signal<string>('');
  protected loading = signal<boolean>(false);
  protected members = signal<any[]>([]);
  protected object = signal<'people' | 'households' | null>(null);

  protected get isPeople() {
    return computed(() => this.object() === 'people');
  }

  public async ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) return;
    this.id.set(id);

    try {
      this.loading.set(true);

      const list = (await this.lists.getById(id)) as ListsType;
      this.object.set(list.object as 'people' | 'households');
      this.form.patchValue({ name: list.name ?? '', description: list.description ?? '' });

      if (list.object === 'people') {
        const data = await this.lists.getMembersPersons(id);
        this.members.set(data.rows ?? data);
      } else {
        const data = await this.lists.getMembersHouseholds(id);
        this.members.set(data.rows ?? data);
      }
    } catch (e) {
      this.alerts.showError('Failed to load list');
    } finally {
      this.loading.set(false);
    }
  }

  protected async save(done: () => void) {
    try {
      const val = this.form.getRawValue();
      await this.lists.update(this.id(), { name: val.name!, description: val.description ?? null });
      this.alerts.showSuccess('Saved');
      done();
    } catch (e) {
      this.alerts.showError('Save failed');
      done();
    }
  }
}
