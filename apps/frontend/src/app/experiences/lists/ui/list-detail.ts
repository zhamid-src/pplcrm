import { Component, ViewChild, effect, inject, input, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AddListType, UpdateHouseholdsType, UpdatePersonsType, debounce } from '@common';
import { HouseholdsService } from '@experiences/households/services/households-service';
import { ListsService } from '@experiences/lists/services/lists-service';
import { ListsRefreshService } from '@experiences/lists/services/lists-refresh.service';
import { PersonsService } from '@experiences/persons/services/persons-service';
import { TagsService } from '@experiences/tags/services/tags-service';
import { Icon } from '@icons/icon';
import { AbstractAPIService } from '@services/api/abstract-api.service';
import { AddBtnRow } from '@uxcommon/components/add-btn-row/add-btn-row';
import { AlertService } from '@uxcommon/components/alerts/alert-service';
import { DataGrid } from '@uxcommon/components/datagrid/datagrid';
import { createLoadingGate } from '@uxcommon/loading-gate';

import { ColDef } from 'ag-grid-community';

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
    [limitToTags]="tags"
    [externalFilterFn]="externalFilterFn()"
    [forceClient]="forceClient()"
    [allowFilter]="allowFilter()"
    [showToolbar]="showToolbar()"
    [enableSelection]="enableSelection()"
  ></pc-datagrid>`,
  providers: [{ provide: AbstractAPIService, useClass: HouseholdsService }],
})
export class HouseholdFilterGrid extends DataGrid<'households', UpdateHouseholdsType> {
  protected col: ColDef[] = [
    { field: 'street1', headerName: 'Street 1' },
    { field: 'city', headerName: 'City' },
    { field: 'state', headerName: 'State' },
    { field: 'zip', headerName: 'Zip' },
    { field: 'people_count', headerName: 'People' },
    { field: 'tags', headerName: 'Tags', filter: 'agSetColumnFilter' },
  ];

  public override allowFilter = input<boolean>(true);
  public override showToolbar = input<boolean>(true);
  public override enableSelection = input<boolean>(true);
  public override externalFilterFn = input<((row: any) => boolean) | null>(null);
  public override forceClient = input<boolean>(false);
  public tags: string[] = [];
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
    [limitToTags]="tags"
    [externalFilterFn]="externalFilterFn()"
    [forceClient]="forceClient()"
    [allowFilter]="allowFilter()"
    [showToolbar]="showToolbar()"
    [enableSelection]="enableSelection()"
  ></pc-datagrid>`,
  providers: [{ provide: AbstractAPIService, useClass: PersonsService }],
})
export class PeopleFilterGrid extends DataGrid<'persons', UpdatePersonsType> {
  protected col: ColDef[] = [
    { field: 'first_name', headerName: 'First Name' },
    { field: 'last_name', headerName: 'Last Name' },
    { field: 'email', headerName: 'Email' },
    { field: 'mobile', headerName: 'Mobile' },
    { field: 'tags', headerName: 'Tags', filter: 'agSetColumnFilter' },
    { field: 'city', headerName: 'City' },
    { field: 'state', headerName: 'State' },
    { field: 'zip', headerName: 'Zip' },
  ];

  public override allowFilter = input<boolean>(true);
  public override showToolbar = input<boolean>(true);
  public override enableSelection = input<boolean>(true);
  public override externalFilterFn = input<((row: any) => boolean) | null>(null);
  public override forceClient = input<boolean>(false);
  public tags: string[] = [];
}

/** Component for creating new lists. Allows building static or dynamic lists using filters. */
@Component({
  selector: 'pc-list-detail',
  imports: [
    ReactiveFormsModule,
    AddBtnRow,
    PeopleFilterGrid,
    HouseholdFilterGrid,
    Icon,
    TagRuleBuilderComponent,
  ],
  templateUrl: './list-detail.html',
})
export class ListDetail {
  private readonly alertSvc = inject(AlertService);
  private readonly countRowSelected = signal(0);
  private readonly fb = inject(FormBuilder);
  private readonly householdsSvc = inject(HouseholdsService);
  private readonly listsSvc = inject(ListsService);
  private readonly personsSvc = inject(PersonsService);
  private readonly listsRefresh = inject(ListsRefreshService);

  private _loading = createLoadingGate();
  private debouncedRecount = debounce(() => this.recount());
  @ViewChild(HouseholdFilterGrid) private householdGrid?: HouseholdFilterGrid;
  @ViewChild(PeopleFilterGrid) private peopleGrid?: PeopleFilterGrid;

  protected readonly tagSvc = inject(TagsService);

  protected btnLabel = signal('SAVE');
  protected counting = signal<boolean>(false);
  protected rulesRoot = signal<TagGroup>({ kind: 'group', bool: 'and', items: [] });

  /** Full rule evaluation against a row's tags */
  protected externalRowFilter = (row: any) => {
    const tags: string[] = Array.isArray(row?.tags) ? row.tags.filter(Boolean) : [];
    return this.evalGroupWithRow(this.rulesRoot(), new Set(tags), row);
  };
  protected form = this.fb.group({
    name: ['', [Validators.required]],
    description: [''],
    object: ['people'],
    is_dynamic: [false],
  });
  protected isLoading = this._loading.visible;
  protected listType = toSignal(this.form.get('object')!.valueChanges, {
    initialValue: this.form.get('object')!.value,
  });
  protected matchCount = signal<number | null>(null);
  protected rulesError = signal<string | null>(null);

  // Wizard state
  protected step = signal<1 | 2 | 3 | 4>(1);

  constructor() {
    effect(() => {
      const type = this.listType();
      const isDynamic = this.form.get('is_dynamic')!.value === true;
      if (type === 'people') {
        this.countRowSelected.set(this.peopleGrid?.getCountRowSelected() ?? 0);
      } else {
        this.countRowSelected.set(this.householdGrid?.getCountRowSelected() ?? 0);
      }

      // Update button label: only show selected count for static lists
      if (!isDynamic && this.countRowSelected() > 0) {
        this.btnLabel.set(`SAVE (${this.countRowSelected()} selected)`);
      } else {
        this.btnLabel.set('SAVE');
      }
    });

    // Keep preview grids in sync with tag rules (use only positive eq tags for quick preview)
    effect(() => {
      const tags = this.flattenPositiveTags(this.rulesRoot());
      if (this.peopleGrid) this.peopleGrid.tags = tags;
      if (this.householdGrid) this.householdGrid.tags = tags;
      // Refresh external filter consumers
      this.peopleGrid?.triggerFilterChanged();
      this.householdGrid?.triggerFilterChanged();
    });

    // Recompute count whenever rules or object type change
    effect(() => {
      // touch signals
      this.rulesRoot();
      this.form.get('object')!.value;
      this.debouncedRecount();
    });
  }

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
    this.peopleGrid?.triggerFilterChanged();
    this.householdGrid?.triggerFilterChanged();
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
      const def = payload.object === 'people' ? this.peopleGrid?.getDefinition() : this.householdGrid?.getDefinition();
      const tags_expression = this.rulesRoot();
      payload.definition = {
        ...(def ?? {}),
        filterModel: { ...(def?.filterModel ?? {}), tags_expression },
        // provide a simplified positive-tags list for compatibility
        tags: this.flattenPositiveTags(tags_expression),
      };
    } else {
      // Static lists: persist a snapshot based on the full filter definition
      const def = payload.object === 'people' ? this.peopleGrid?.getDefinition() : this.householdGrid?.getDefinition();
      const tags_expression = this.rulesRoot();
      payload.definition = {
        ...(def ?? {}),
        filterModel: { ...(def?.filterModel ?? {}), tags_expression },
        tags: this.flattenPositiveTags(tags_expression),
      };
      // Do not send member_ids limited to the current page; backend will expand definition to all matches
      delete (payload as any).member_ids;
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

  /** Recount matches using current rules (approximate: positive tags only) */
  private async recount() {
    const err = this.validateRules();
    if (err) {
      this.rulesError.set(err);
      this.matchCount.set(null);
      return;
    }

    const object = this.form.get('object')!.value as 'people' | 'households';
    const svc = object === 'people' ? this.personsSvc : this.householdsSvc;
    const hasRules = this.hasAnyRule(this.rulesRoot());
    const tags = this.flattenPositiveTags(this.rulesRoot());

    this.rulesError.set(null);
    this.counting.set(true);
    try {
      if (!hasRules) {
        const total = await svc.count();
        this.matchCount.set(total);
      } else if (tags.length > 0) {
        const res = (await svc.getAll({ tags, limit: 1 })) as { count: number };
        this.matchCount.set(res?.count ?? null);
      } else {
        this.matchCount.set(null);
        this.rulesError.set('Preview count requires at least one "tag is …" rule');
      }
    } catch (e) {
      this.matchCount.set(null);
      this.rulesError.set('Failed to compute count');
    } finally {
      this.counting.set(false);
    }
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
