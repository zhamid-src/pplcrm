/**
 * Component for creating or editing a list of people or households.
 */
import { Component, OnInit, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { AddListType, UpdateListType } from '@common';
import { AddBtnRow } from '@uxcommon/components/add-btn-row/add-btn-row';
import { AlertService } from '@uxcommon/components/alerts/alert-service';
import { FormInput } from '@uxcommon/components/form-input/formInput';
import { Tags } from '@uxcommon/components/tags/tags';
import { TextArea } from '@uxcommon/components/textarea/textarea';
import { createLoadingGate } from '@uxcommon/loading-gate';

import { ListsService } from '../services/lists-service';
import { Lists } from 'common/src/lib/kysely.models';

@Component({
  selector: 'pc-list-detail',
  imports: [FormInput, ReactiveFormsModule, TextArea, AddBtnRow, Tags, RouterModule],
  templateUrl: './list-detail.html',
})
export class ListDetail implements OnInit {
  private readonly alertSvc = inject(AlertService);
  private readonly fb = inject(FormBuilder);
  private readonly listsSvc = inject(ListsService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  private _loading = createLoadingGate();

  protected isLoading = this._loading.visible;
  protected list = signal<Lists | null>(null);

  protected form = this.fb.group({
    name: [''],
    description: [''],
    object: ['people'],
    is_dynamic: [false],
    city: [''],
  });

  protected id: string | null = null;
  protected tags = signal<string[]>([]);

  public mode = input<'new' | 'edit'>('edit');

  constructor() {
    if (this.mode() === 'edit') {
      this.id = this.route.snapshot.paramMap.get('id');
    }
  }

  public ngOnInit() {
    this.loadList();
  }

  public save() {
    const data = this.form.getRawValue() as AddListType;
    return this.id ? this.update(data) : this.add(data);
  }

  protected tagAdded(tag: string) {
    this.tags.update((t) => [...t, tag]);
  }

  protected tagRemoved(tag: string) {
    this.tags.update((t) => t.filter((x) => x !== tag));
  }

  private buildDefinition(data: any) {
    const definition: any = {};
    if (this.tags().length) definition.tags = this.tags();
    const filterModel: any = {};
    if (data.city) filterModel.city = data.city;
    if (Object.keys(filterModel).length) definition.filterModel = filterModel;
    return definition;
  }

  private add(data: AddListType) {
    const end = this._loading.begin();
    const definition = this.buildDefinition(data);
    this.listsSvc
      .add({ ...data, definition })
      .then(() => {
        this.alertSvc.showSuccess('List added');
        this.router.navigate(['lists']);
      })
      .catch((err: unknown) => this.alertSvc.showError(String(err)))
      .finally(() => end());
  }

  private update(data: UpdateListType) {
    if (!this.id) return;
    const end = this._loading.begin();
    const definition = this.buildDefinition(data);
    this.listsSvc
      .update(this.id, { ...data, definition })
      .then(() => this.alertSvc.showSuccess('List updated'))
      .catch((err: unknown) => this.alertSvc.showError(String(err)))
      .finally(() => end());
  }

  private async loadList() {
    if (!this.id) return;
    const end = this._loading.begin();
    try {
      const list = (await this.listsSvc.getById(this.id)) as Lists;
      this.list.set(list);
      this.form.patchValue(list as any);
      const def: any = list.definition || {};
      if (Array.isArray(def.tags)) this.tags.set(def.tags);
      if (def.filterModel?.city) this.form.get('city')?.setValue(def.filterModel.city);
    } finally {
      end();
    }
  }
}

