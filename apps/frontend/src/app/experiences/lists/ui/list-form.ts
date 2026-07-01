import { Component, OnInit, computed, inject, input, resource, signal, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';

import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { map } from 'rxjs';
import { AddListType, UpdateListType } from '../../../../../../../libs/common/src';
import { HouseholdsService } from '@experiences/households/services/households-service';
import { ListsService } from '@experiences/lists/services/lists-service';
import { ListsRefreshService } from '@experiences/lists/services/lists-refresh.service';
import { PersonsService } from '@experiences/persons/services/persons-service';
import { TagsService } from '@experiences/tags/services/tags-service';
import { Icon } from '@icons/icon';
import { AbstractAPIService } from '../../../services/api/abstract-api.service';
import { FormActions } from '@uxcommon/components/form-actions/form-actions';
import { AlertService } from '@uxcommon/components/alerts/alert-service';
import { DataGrid } from '@frontend/shared/components/datagrid/datagrid';
import { createLoadingGate } from '@uxcommon/loading-gate';

import type { ColumnDef as ColDef } from '@frontend/shared/components/datagrid/grid-defaults';
import { ConfirmDialogService } from '../../../services/shared-dialog.service';

import { QueryBuilderField, QueryBuilderComponent } from '@frontend/shared/components/query-builder/query-builder';
import { QueryBuilderNode, QueryBuilderGroupNode, cloneQueryBuilderNode } from '../../../../../../../libs/common/src';

@Component({
  selector: 'pc-household-filter-grid',
  imports: [DataGrid],
  template: `<pc-datagrid
    #grid
    [colDefs]="col"
    [disableDelete]="true"
    [disableExport]="true"
    [disableImport]="true"
    [disableRefresh]="true"
    [disableView]="disableView()"
    [limitToTags]="tags()"
    [allowFilter]="allowFilter()"
    [showToolbar]="showToolbar()"
    [enableSelection]="enableSelection()"
    [externalAdvancedFilterModel]="externalAdvancedFilterModel()"
  ></pc-datagrid>`,
  providers: [{ provide: AbstractAPIService, useExisting: HouseholdsService }],
})
export class HouseholdFilterGrid {
  private readonly grid = viewChild(DataGrid);

  protected col: ColDef[] = [
    {
      field: 'address',
      headerName: 'Address',
      valueGetter: (params: any) => {
        const data = params?.data;
        if (!data) return '';
        const parts: string[] = [];
        const streetParts = [data.apt ? `Apt ${data.apt}` : null, data.street_num, data.street1, data.street2].filter(
          Boolean,
        );
        const locationParts = [data.city, data.state, data.zip, data.country].filter(Boolean);
        if (streetParts.length) parts.push(streetParts.join(' ').trim());
        if (locationParts.length) parts.push(locationParts.join(', ').trim());
        return parts.join(', ').trim() || 'No household assigned';
      },
    },
    { field: 'people_count', headerName: 'People' },
    { field: 'tags', headerName: 'Tags' },
  ];

  public allowFilter = input<boolean>(true);
  public showToolbar = input<boolean>(true);
  public enableSelection = input<boolean>(true);
  public disableView = input<boolean>(true);
  public externalAdvancedFilterModel = input<any | null>(null);
  public readonly tags = input<string[]>([]);

  public getCountRowSelected() {
    return this.grid()?.getCountRowSelected() ?? 0;
  }
  public getDefinition() {
    return this.grid()?.getDefinition();
  }
  public triggerFilterChanged() {
    this.grid()?.triggerFilterChanged();
  }
}

@Component({
  selector: 'pc-people-filter-grid',
  imports: [DataGrid],
  template: `<pc-datagrid
    #grid
    [colDefs]="col"
    [disableDelete]="true"
    [disableExport]="true"
    [disableImport]="true"
    [disableRefresh]="true"
    [disableView]="disableView()"
    [limitToTags]="tags()"
    [allowFilter]="allowFilter()"
    [showToolbar]="showToolbar()"
    [enableSelection]="enableSelection()"
    [externalAdvancedFilterModel]="externalAdvancedFilterModel()"
  ></pc-datagrid>`,
  providers: [{ provide: AbstractAPIService, useExisting: PersonsService }],
})
export class PeopleFilterGrid {
  private readonly grid = viewChild(DataGrid);

  protected col: ColDef[] = [
    { field: 'first_name', headerName: 'First Name' },
    { field: 'last_name', headerName: 'Last Name' },
    { field: 'email', headerName: 'Email' },
    { field: 'mobile', headerName: 'Mobile' },
    { field: 'tags', headerName: 'Tags' },
    {
      field: 'address',
      headerName: 'Address',
      valueGetter: (params: any) => {
        const data = params?.data;
        if (!data) return '';
        const parts: string[] = [];
        const streetParts = [data.apt ? `Apt ${data.apt}` : null, data.street_num, data.street1, data.street2].filter(
          Boolean,
        );
        const locationParts = [data.city, data.state, data.zip, data.country].filter(Boolean);
        if (streetParts.length) parts.push(streetParts.join(' ').trim());
        if (locationParts.length) parts.push(locationParts.join(', ').trim());
        return parts.join(', ').trim() || 'No household assigned';
      },
    },
  ];

  public allowFilter = input<boolean>(true);
  public showToolbar = input<boolean>(true);
  public enableSelection = input<boolean>(true);
  public disableView = input<boolean>(true);
  public externalAdvancedFilterModel = input<any | null>(null);
  public readonly tags = input<string[]>([]);

  public getCountRowSelected() {
    return this.grid()?.getCountRowSelected() ?? 0;
  }
  public getDefinition() {
    return this.grid()?.getDefinition();
  }
  public triggerFilterChanged() {
    this.grid()?.triggerFilterChanged();
  }
}

@Component({
  selector: 'pc-list-form',
  imports: [ReactiveFormsModule, FormActions, PeopleFilterGrid, HouseholdFilterGrid, Icon, QueryBuilderComponent],
  templateUrl: './list-form.html',
})
export class ListForm implements OnInit {
  private readonly alertSvc = inject(AlertService);
  private readonly fb = inject(FormBuilder);
  private readonly householdsSvc = inject(HouseholdsService);
  private readonly listsSvc = inject(ListsService);
  private readonly personsSvc = inject(PersonsService);
  private readonly listsRefresh = inject(ListsRefreshService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly dialogs = inject(ConfirmDialogService);

  private _loading = createLoadingGate();
  private readonly householdGrid = viewChild(HouseholdFilterGrid);
  private readonly peopleGrid = viewChild(PeopleFilterGrid);

  protected readonly tagSvc = inject(TagsService);

  protected readonly id = signal<string | null>(null);
  protected readonly isNew = signal<boolean>(true);

  protected readonly form = this.fb.group({
    name: ['', [Validators.required]],
    description: [''],
    object: ['people'],
    is_dynamic: [false],
  });

  protected readonly listType = toSignal(
    this.form.get('object')!.valueChanges.pipe(map((v) => v || 'people')),
    { initialValue: (this.form.get('object')?.value ?? 'people') as string },
  );

  protected readonly isDynamic = toSignal(
    this.form.get('is_dynamic')!.valueChanges.pipe(map((v) => v === true)),
    { initialValue: this.form.get('is_dynamic')?.value === true },
  );

  public ngOnInit(): void {

    void this.loadOnInit();

  }


  private async loadOnInit(): Promise<void> {
    const id = this.route.snapshot.paramMap.get('id');
    const mode = this.route.snapshot.data['mode'] as 'new' | 'edit' | undefined;
    this.isNew.set(mode !== 'edit');
    if (id && mode === 'edit') {
      this.id.set(id);
      await this.loadList();
    }
  }

  private async loadList() {
    const id = this.id();
    if (!id) return;
    const end = this._loading.begin();
    try {
      const list = (await this.listsSvc.getById(id)) as any;
      if (list) {
        this.form.patchValue({
          name: list.name ?? '',
          description: list.description ?? '',
          object: list.object ?? 'people',
          is_dynamic: list.is_dynamic ?? false,
        });

        const definition = list.definition as any;
        if (definition) {
          if (definition.advancedFilterModel) {
            this.rulesRoot.set(definition.advancedFilterModel);
          } else if (definition.filterModel?.tags_expression) {
            this.rulesRoot.set(definition.filterModel.tags_expression);
          }
        }
      }
    } catch (_err) {
      this.alertSvc.showError('Failed to load list details');
    } finally {
      end();
    }
  }

  protected readonly countRowSelected = computed(() => {
    const type = this.listType();
    if (type === 'people') {
      return this.peopleGrid()?.getCountRowSelected() ?? 0;
    } else {
      return this.householdGrid()?.getCountRowSelected() ?? 0;
    }
  });

  protected readonly btnLabel = computed(() => {
    const isDynamic = this.isDynamic();
    const count = this.countRowSelected();
    return !isDynamic && count > 0 ? `SAVE (${count} selected)` : 'SAVE';
  });

  protected readonly rulesRoot = signal<QueryBuilderGroupNode>({
    kind: 'group',
    id: 'root',
    conjunction: 'AND',
    rules: [],
  });

  protected readonly listFields = computed<QueryBuilderField[]>(() => {
    const isPeople = this.listType() === 'people';
    const tagOperators = [
      { value: 'eq', label: 'is' },
      { value: 'neq', label: 'is not' },
      { value: 'contains', label: 'contains' },
      { value: 'notContains', label: 'does not contain' },
      { value: 'equals', label: 'equals' },
      { value: 'notEquals', label: 'does not equal' },
      { value: 'startsWith', label: 'starts with' },
      { value: 'endsWith', label: 'ends with' },
      { value: 'isEmpty', label: 'is empty' },
      { value: 'isNotEmpty', label: 'is not empty' },
    ];
    const textOperators = [
      { value: 'contains', label: 'contains' },
      { value: 'notContains', label: 'does not contain' },
      { value: 'equals', label: 'equals' },
      { value: 'notEquals', label: 'does not equal' },
      { value: 'startsWith', label: 'starts with' },
      { value: 'endsWith', label: 'ends with' },
      { value: 'isEmpty', label: 'is empty' },
      { value: 'isNotEmpty', label: 'is not empty' },
    ];

    if (isPeople) {
      return [
        { name: 'tags', label: 'Tags', operators: tagOperators, inputType: 'autocomplete' as const },
        { name: 'issues', label: 'Issues', operators: tagOperators, inputType: 'autocomplete' as const },
        { name: 'first_name', label: 'First Name', operators: textOperators, inputType: 'text' as const },
        { name: 'last_name', label: 'Last Name', operators: textOperators, inputType: 'text' as const },
        { name: 'email', label: 'Email', operators: textOperators, inputType: 'text' as const },
        { name: 'mobile', label: 'Mobile', operators: textOperators, inputType: 'text' as const },
        { name: 'company_name', label: 'Company', operators: textOperators, inputType: 'text' as const },
        { name: 'city', label: 'City', operators: textOperators, inputType: 'text' as const },
        { name: 'state', label: 'State/Province', operators: textOperators, inputType: 'text' as const },
        { name: 'street1', label: 'Street 1', operators: textOperators, inputType: 'text' as const },
        { name: 'street_num', label: 'Street Number', operators: textOperators, inputType: 'text' as const },
        { name: 'zip', label: 'Zip Code', operators: textOperators, inputType: 'text' as const },
      ];
    } else {
      return [
        { name: 'tags', label: 'Tags', operators: tagOperators, inputType: 'autocomplete' as const },
        { name: 'issues', label: 'Issues', operators: tagOperators, inputType: 'autocomplete' as const },
        { name: 'city', label: 'City', operators: textOperators, inputType: 'text' as const },
        { name: 'state', label: 'State/Province', operators: textOperators, inputType: 'text' as const },
        { name: 'street1', label: 'Street 1', operators: textOperators, inputType: 'text' as const },
        { name: 'street2', label: 'Street 2', operators: textOperators, inputType: 'text' as const },
        { name: 'street_num', label: 'Street Number', operators: textOperators, inputType: 'text' as const },
        { name: 'zip', label: 'Zip Code', operators: textOperators, inputType: 'text' as const },
        { name: 'home_phone', label: 'Home Phone', operators: textOperators, inputType: 'text' as const },
      ];
    }
  });

  protected externalRowFilter = (row: any) => {
    const tags: string[] = Array.isArray(row?.tags) ? row.tags.filter(Boolean) : [];
    return this.evalGroupWithRow(this.rulesRoot(), new Set(tags), row);
  };
  protected isLoading = this._loading.visible;

  protected readonly rulesError = computed(() => {
    return this.validateRules();
  });

  protected readonly matchCountResource = resource({
    params: () => ({
      rules: this.rulesRoot(),
      object: this.listType(),
      hasRules: this.hasAnyRule(this.rulesRoot()),
      hasError: !!this.rulesError(),
    }),
    loader: async ({ params }) => {
      if (params.hasError) {
        return 0;
      }

      const svc = params.object === 'people' ? this.personsSvc : this.householdsSvc;
      if (!params.hasRules) {
        return await svc.count();
      } else {
        const res = (await svc.getAll({
          advancedFilterModel: params.rules,
          limit: 1,
        })) as { count: number };
        return res?.count ?? 0;
      }
    },
  });

  protected readonly matchCount = computed(() => {
    const val = this.matchCountResource.value();
    return val !== undefined ? val : null;
  });

  protected readonly counting = this.matchCountResource.isLoading;

  protected readonly previewTags = computed(() => this.flattenPositiveTags(this.rulesRoot()));

  // Wizard state
  protected step = signal<1 | 2 | 3 | 4>(1);

  protected back() {
    const s = this.step();
    if (s > 1) this.step.set((s - 1) as unknown as 1 | 2 | 3 | 4);
  }

  protected flattenPositiveTags(group: QueryBuilderGroupNode): string[] {
    const out: string[] = [];
    const walk = (rules: QueryBuilderNode[]) => {
      for (const it of rules) {
        if (it.kind === 'rule') {
          const r = it as { kind: 'rule'; op: 'eq' | 'neq'; value: string };
          if (r.op === 'eq' && r.value) out.push(r.value);
        } else if (it.kind === 'group') {
          walk(it.rules as QueryBuilderNode[]);
        }
      }
    };
    walk(group.rules);
    return Array.from(new Set(out));
  }

  protected goto(step: 1 | 2 | 3 | 4) {
    this.step.set(step);
  }

  protected next() {
    const s = this.step();
    if (s < 4) this.step.set((s + 1) as unknown as 1 | 2 | 3 | 4);
  }

  protected onRulesChanged() {
    this.rulesRoot.update((g) => cloneQueryBuilderNode(g) as QueryBuilderGroupNode);
    this.peopleGrid()?.triggerFilterChanged();
    this.householdGrid()?.triggerFilterChanged();
  }

  protected save(done: (() => void) | Event) {
    let doneFn: () => void = () => { /* no-op default */ };
    if (done instanceof Event) {
      done.preventDefault();
    } else if (typeof done === 'function') {
      doneFn = done;
    }

    const formValue = this.form.getRawValue();

    const end = this._loading.begin();
    let savePromise;

    if (this.isNew()) {
      const payload: AddListType = {
        name: formValue.name!,
        description: formValue.description ?? null,
        object: formValue.object as 'people' | 'households',
        is_dynamic: formValue.is_dynamic ?? false,
      };

      if (payload.is_dynamic) {
        // Dynamic lists: use current filters/search as definition
        const def =
          payload.object === 'people' ? this.peopleGrid()?.getDefinition() : this.householdGrid()?.getDefinition();
        const tags_expression = this.rulesRoot();
        payload.definition = {
          ...(def ?? {}),
          filterModel: { ...(def?.filterModel ?? {}), tags_expression },
          advancedFilterModel: tags_expression,
          // provide a simplified positive-tags list for compatibility
          tags: this.flattenPositiveTags(tags_expression),
        };
      } else {
        // Static lists: persist a snapshot based on the full filter definition
        const def =
          payload.object === 'people' ? this.peopleGrid()?.getDefinition() : this.householdGrid()?.getDefinition();
        const tags_expression = this.rulesRoot();
        payload.definition = {
          ...(def ?? {}),
          filterModel: { ...(def?.filterModel ?? {}), tags_expression },
          advancedFilterModel: tags_expression,
          tags: this.flattenPositiveTags(tags_expression),
        };
        // Do not send member_ids limited to the current page; backend will expand definition to all matches
        delete (payload as Record<string, unknown>)['member_ids'];
      }
      savePromise = this.listsSvc.add(payload);
    } else {
      const payload: UpdateListType = {
        name: formValue.name!,
        description: formValue.description ?? null,
      };
      savePromise = this.listsSvc.update(this.id()!, payload);
    }

    savePromise
      .then(async () => {
        this.alertSvc.showSuccess(this.isNew() ? 'List added' : 'List updated');
        this.listsRefresh.trigger();
        doneFn();
        if (this.isNew()) {
          await this.router.navigate(['/lists']);
        } else {
          await this.router.navigate(['/lists', this.id()!]);
        }
      })
      .catch((err: any) => {
        const message =
          err?.message || err?.data?.message || (this.isNew() ? 'Failed to add list' : 'Failed to update list');
        this.alertSvc.showError(message);
        doneFn();
      })
      .finally(() => end());
  }

  protected async deleteList() {
    if (this.isNew() || !this.id()) return;
    const confirmed = await this.dialogs.confirm({
      title: 'Delete List',
      message: 'Are you sure you want to delete this list? This action cannot be undone.',
      variant: 'danger',
      confirmText: 'Delete',
    });
    if (!confirmed) return;

    const end = this._loading.begin();
    try {
      await this.listsSvc.delete(this.id()!);
      this.listsRefresh.trigger();
      this.alertSvc.showSuccess('List deleted');
      await this.router.navigate(['/lists']);
    } catch (err: any) {
      const message = err?.message || err?.data?.message || 'Unable to delete list';
      this.alertSvc.showError(message);
    } finally {
      end();
    }
  }

  private evalGroupWithRow(group: QueryBuilderGroupNode, tagSet: Set<string>, row: any): boolean {
    const results = group.rules.map((it) =>
      this.isRule(it)
        ? this.evalRule(it, tagSet, row)
        : this.evalGroupWithRow(it as QueryBuilderGroupNode, tagSet, row),
    );
    if (group.conjunction === 'AND') return results.every(Boolean);
    return results.some(Boolean);
  }

  private evalRule(rule: { field: string; op: string; value?: any }, tagSet: Set<string>, row: any): boolean {
    const field = rule.field;
    const op = rule.op;
    const val = rule.value;

    if (field === 'tag' || field === 'tags' || field === 'issues') {
      if (!val) return false;
      const has = tagSet.has(val);
      return op === 'eq' || op === 'equals' || op === 'contains' ? has : !has;
    }

    // For other fields, retrieve the row value
    const rowVal = String(row?.[field] ?? '')
      .trim()
      .toLowerCase();
    const searchVal = String(val ?? '')
      .trim()
      .toLowerCase();

    const isEmpty = rowVal.length === 0;

    switch (op) {
      case 'empty':
      case 'isEmpty':
        return isEmpty;
      case 'notempty':
      case 'isNotEmpty':
        return !isEmpty;
      case 'equals':
      case 'eq':
        return rowVal === searchVal;
      case 'notEquals':
      case 'neq':
        return rowVal !== searchVal;
      case 'contains':
        return rowVal.includes(searchVal);
      case 'notContains':
        return !rowVal.includes(searchVal);
      case 'startsWith':
        return rowVal.startsWith(searchVal);
      case 'endsWith':
        return rowVal.endsWith(searchVal);
      default:
        return true;
    }
  }

  private isRule(item: QueryBuilderNode): item is {
    kind: 'rule';
    id: string;
    field: string;
    op: string;
    value?: any;
  } {
    return item.kind === 'rule';
  }

  private validateRules(): string | null {
    let invalid = false;
    const walk = (rules: QueryBuilderNode[]) => {
      for (const it of rules) {
        if (it.kind === 'rule') {
          const r = it as { field: string; op: string; value?: string };
          const valueless = ['isEmpty', 'isNotEmpty', 'empty', 'notempty'].includes(r.op);
          if (!valueless && (!r.value || !String(r.value).trim())) {
            invalid = true;
          }
        } else if (it.kind === 'group') {
          walk(it.rules as QueryBuilderNode[]);
        }
      }
    };
    walk(this.rulesRoot().rules);
    if (invalid) return 'Complete all rules (enter a search term or value)';
    return null;
  }

  private hasAnyRule(group: QueryBuilderGroupNode): boolean {
    const stack: QueryBuilderNode[] = [...group.rules];
    while (stack.length) {
      const item = stack.pop()!;
      if (item.kind === 'rule') return true;
      if (item.kind === 'group') stack.push(...item.rules);
    }
    return false;
  }
}
