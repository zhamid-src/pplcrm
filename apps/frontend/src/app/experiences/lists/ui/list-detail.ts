import { Component, computed, inject, input, resource, signal, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AddListType, UpdateHouseholdsType, UpdatePersonsType } from '@common';
import { HouseholdsService } from '@experiences/households/services/households-service';
import { ListsService } from '@experiences/lists/services/lists-service';
import { ListsRefreshService } from '@experiences/lists/services/lists-refresh.service';
import { PersonsService } from '@experiences/persons/services/persons-service';
import { TagsService } from '@experiences/tags/services/tags-service';
import { Icon } from '@icons/icon';
import { AbstractAPIService } from '../../../services/api/abstract-api.service';
import { AddBtnRow } from '@uxcommon/components/add-btn-row/add-btn-row';
import { AlertService } from '@uxcommon/components/alerts/alert-service';
import { DataGrid } from '@uxcommon/components/datagrid/datagrid';
import { createLoadingGate } from '@uxcommon/loading-gate';

import type { ColumnDef as ColDef } from '@uxcommon/components/datagrid/grid-defaults';

import { TagGroup, TagRuleBuilderComponent, TagRuleItem } from './tag-rule-builder';

/** Grid component for filtering households when creating lists */
@Component({
  selector: 'pc-household-filter-grid',
  imports: [DataGrid],
  template: `<pc-datagrid
    [colDefs]="col"
    [disableDelete]="true"
    [disableExport]="true"
    [disableImport]="true"
    [disableRefresh]="true"
    [disableView]="true"
    [limitToTags]="tags()"
    [allowFilter]="allowFilter()"
    [showToolbar]="showToolbar()"
    [enableSelection]="enableSelection()"
  ></pc-datagrid>`,
  providers: [{ provide: AbstractAPIService, useExisting: HouseholdsService }],
})
export class HouseholdFilterGrid extends DataGrid<'households', UpdateHouseholdsType> {
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

  public override allowFilter = input<boolean>(true);
  public override showToolbar = input<boolean>(true);
  public override enableSelection = input<boolean>(true);
  public readonly tags = input<string[]>([]);
}

/** Grid component for filtering people when creating lists */
@Component({
  selector: 'pc-people-filter-grid',
  imports: [DataGrid],
  template: `<pc-datagrid
    [colDefs]="col"
    [disableDelete]="true"
    [disableExport]="true"
    [disableImport]="true"
    [disableRefresh]="true"
    [disableView]="true"
    [limitToTags]="tags()"
    [allowFilter]="allowFilter()"
    [showToolbar]="showToolbar()"
    [enableSelection]="enableSelection()"
  ></pc-datagrid>`,
  providers: [{ provide: AbstractAPIService, useExisting: PersonsService }],
})
export class PeopleFilterGrid extends DataGrid<'persons', UpdatePersonsType> {
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

  public override allowFilter = input<boolean>(true);
  public override showToolbar = input<boolean>(true);
  public override enableSelection = input<boolean>(true);
  public readonly tags = input<string[]>([]);
}

/** Component for creating new lists. Allows building static or dynamic lists using filters. */
@Component({
  selector: 'pc-list-detail',
  imports: [ReactiveFormsModule, AddBtnRow, PeopleFilterGrid, HouseholdFilterGrid, Icon, TagRuleBuilderComponent],
  templateUrl: './list-detail.html',
})
export class ListDetail {
  private readonly alertSvc = inject(AlertService);
  private readonly fb = inject(FormBuilder);
  private readonly householdsSvc = inject(HouseholdsService);
  private readonly listsSvc = inject(ListsService);
  private readonly personsSvc = inject(PersonsService);
  private readonly listsRefresh = inject(ListsRefreshService);

  private _loading = createLoadingGate();
  private readonly householdGrid = viewChild(HouseholdFilterGrid);
  private readonly peopleGrid = viewChild(PeopleFilterGrid);

  protected readonly tagSvc = inject(TagsService);

  protected readonly form = this.fb.group({
    name: ['', [Validators.required]],
    description: [''],
    object: ['people'],
    is_dynamic: [false],
  });

  protected readonly listType = toSignal(this.form.get('object')!.valueChanges, {
    initialValue: this.form.get('object')!.value,
  });

  protected readonly isDynamic = toSignal(this.form.get('is_dynamic')!.valueChanges, {
    initialValue: this.form.get('is_dynamic')!.value === true,
  });

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

  protected readonly rulesRoot = signal<TagGroup>({ kind: 'group', bool: 'and', items: [] });

  /** Full rule evaluation against a row's tags */
  protected externalRowFilter = (row: any) => {
    const tags: string[] = Array.isArray(row?.tags) ? row.tags.filter(Boolean) : [];
    return this.evalGroupWithRow(this.rulesRoot(), new Set(tags), row);
  };
  protected isLoading = this._loading.visible;

  protected readonly rulesError = computed(() => {
    const validationErr = this.validateRules();
    if (validationErr) {
      return validationErr;
    }
    const hasRules = this.hasAnyRule(this.rulesRoot());
    const tags = this.flattenPositiveTags(this.rulesRoot());
    if (hasRules && tags.length === 0) {
      return 'Preview count requires at least one "tag is …" rule';
    }
    return null;
  });

  protected readonly matchCountResource = resource({
    params: () => ({
      rules: this.rulesRoot(),
      object: this.listType(),
      hasRules: this.hasAnyRule(this.rulesRoot()),
      tags: this.flattenPositiveTags(this.rulesRoot()),
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
        const res = (await svc.getAll({ tags: params.tags, limit: 1 })) as { count: number };
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

  /** Returns only positive (equals) tags from the rule tree for preview */
  protected flattenPositiveTags(group: TagGroup): string[] {
    const out: string[] = [];
    const walk = (items: TagRuleItem[]) => {
      for (const it of items) {
        if (it.kind === 'rule') {
          const r = it as { kind: 'rule'; op: 'eq' | 'neq'; value: string };
          if (r.op === 'eq' && r.value) out.push(r.value);
        } else if (it.kind === 'group') {
          walk(it.items as TagRuleItem[]);
        }
      }
    };
    walk(group.items);
    return Array.from(new Set(out));
  }

  protected goto(step: 1 | 2 | 3 | 4) {
    this.step.set(step);
  }

  /** Navigation helpers for wizard */
  protected next() {
    const s = this.step();
    if (s < 4) this.step.set((s + 1) as unknown as 1 | 2 | 3 | 4);
  }

  protected onRulesChanged() {
    // trigger effects; nothing else required as we use signals
    this.rulesRoot.update((g) => ({ ...g }));
    this.peopleGrid()?.triggerFilterChanged();
    this.householdGrid()?.triggerFilterChanged();
  }

  /** Save the list using selection for static, or filters for dynamic */
  protected save(done: () => void) {
    const formValue = this.form.getRawValue();

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
        tags: this.flattenPositiveTags(tags_expression),
      };
      // Do not send member_ids limited to the current page; backend will expand definition to all matches
      delete (payload as Record<string, unknown>)['member_ids'];
    }

    const end = this._loading.begin();
    this.listsSvc
      .add(payload)
      .then(() => {
        this.alertSvc.showSuccess('List added');
        this.listsRefresh.trigger();
        done();
      })
      .catch((err: any) => this.alertSvc.showError(err?.message ?? String(err)))
      .finally(() => end());
  }

  private evalGroupWithRow(group: TagGroup, tagSet: Set<string>, row: any): boolean {
    const results = group.items.map((it) =>
      this.isRule(it) ? this.evalRule(it, tagSet, row) : this.evalGroupWithRow(it as TagGroup, tagSet, row),
    );
    if (group.bool === 'and') return results.every(Boolean);
    return results.some(Boolean);
  }

  private evalRule(
    rule: { field: 'tag' | 'email' | 'mobile'; op: 'eq' | 'neq' | 'empty' | 'notempty'; value?: string },
    tagSet: Set<string>,
    row: any,
  ): boolean {
    if (rule.field === 'tag') {
      if (!rule.value) return false;
      const has = tagSet.has(rule.value);
      return rule.op === 'eq' ? has : !has;
    }
    // For households, ignore non-tag rules
    const object = this.form.get('object')!.value as 'people' | 'households';
    if (object === 'households') return true;

    const value = String((rule.field === 'email' ? row?.email : row?.mobile) ?? '').trim();
    const isEmpty = value.length === 0;
    return rule.op === 'empty' ? isEmpty : !isEmpty;
  }

  private isRule(item: TagRuleItem): item is {
    kind: 'rule';
    field: 'tag' | 'email' | 'mobile';
    op: 'eq' | 'neq' | 'empty' | 'notempty';
    value?: string;
  } {
    return item.kind === 'rule';
  }

  /** Validate rules: every rule must have a value; at least one rule somewhere */
  private validateRules(): string | null {
    let invalid = false;
    const walk = (items: TagRuleItem[]) => {
      for (const it of items) {
        if (it.kind === 'rule') {
          const r = it as { field: 'tag' | 'email' | 'mobile'; value?: string };
          if (r.field === 'tag') {
            if (!r.value || !String(r.value).trim()) invalid = true;
          }
        } else if (it.kind === 'group') {
          walk(it.items as TagRuleItem[]);
        }
      }
    };
    walk(this.rulesRoot().items);
    // Allow zero rules (Everyone)
    if (invalid) return 'Complete all tag rules (select a tag)';
    return null;
  }

  private hasAnyRule(group: TagGroup): boolean {
    const stack: TagRuleItem[] = [...group.items];
    while (stack.length) {
      const item = stack.pop()!;
      if (item.kind === 'rule') return true;
      if (item.kind === 'group') stack.push(...item.items);
    }
    return false;
  }
}
