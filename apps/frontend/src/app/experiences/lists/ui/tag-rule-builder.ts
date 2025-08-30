import { Component, EventEmitter, Input, Output } from '@angular/core';
import { TagsService } from '@experiences/tags/services/tags-service';
import { AutoComplete } from '@uxcommon/components/autocomplete/autocomplete';

export interface Rule {
  field: RuleField;
  kind: 'rule';
  op: RuleOp;
  value?: string;
}

export interface TagGroup {
  bool: 'and' | 'or';
  items: TagRuleItem[];
  kind: 'group';
}

@Component({
  selector: 'pc-tag-rule-builder',
  standalone: true,
  imports: [AutoComplete],
  template: `
    <div class="border border-base-300 rounded p-3">
      @if (showSummary) {
        <div class="text-xs text-base-content/70 mb-2 flex items-center justify-between gap-3">
          <div>
            Summary:
            <span class="font-mono break-words">{{ summarizeGroup(group) }}</span>
          </div>
          <div class="whitespace-nowrap">
            @if (summaryError) {
              <span class="text-warning">Error: {{ summaryError }}</span>
            } @else if (summaryCounting) {
              <span>Matches: Counting...</span>
            } @else {
              <span>Matches: {{ summaryMatches ?? 0 }} {{ objectType === 'households' ? 'households' : 'people' }}</span>
            }
          </div>
        </div>
        <div class="divider my-2"></div>
      }
      <div class="flex items-center justify-between mb-2">
        <div class="join">
          <button
            type="button"
            class="btn btn-xs join-item"
            [class.btn-primary]="group.bool === 'and'"
            (click)="setBool('and')"
          >
            All (AND)
          </button>
          <button
            type="button"
            class="btn btn-xs join-item"
            [class.btn-primary]="group.bool === 'or'"
            (click)="setBool('or')"
          >
            Any (OR)
          </button>
        </div>
        <div class="flex gap-2">
          <button type="button" class="btn btn-xs" (click)="addRule()">Add rule</button>
          <button type="button" class="btn btn-xs" (click)="addGroup()">Add group</button>
        </div>
      </div>

      <div class="flex flex-col gap-2">
        @for (item of group.items; track item; let i = $index) {
          @if (isRule(item)) {
            <div class="flex items-center gap-2">
              <select
                class="select select-bordered select-sm w-28"
                [value]="getField(item)"
                (change)="setField(i, $any($event.target).value)"
              >
                <option value="tag">Tag</option>
                @if (objectType !== 'households') {
                  <option value="email">Email</option>
                  <option value="mobile">Mobile</option>
                }
              </select>

              @if (getField(item) === 'tag') {
                <select
                  class="select select-bordered select-sm w-28"
                  [value]="getOp(item)"
                  (change)="setOp(i, $any($event.target).value)"
                >
                  <option value="eq">is</option>
                  <option value="neq">is not</option>
                </select>
                <div class="w-64">
                  <pc-autocomplete
                    [filterSvc]="tagSvc"
                    placeholder="Type a tag..."
                    (valueChange)="setRuleValue(i, $event)"
                  />
                </div>
                @if (getValue(item)) {
                  <div class="badge">{{ getValue(item) }}</div>
                }
              } @else {
                <select
                  class="select select-bordered select-sm w-36"
                  [value]="getOp(item)"
                  (change)="setOp(i, $any($event.target).value)"
                >
                  <option value="empty">is empty</option>
                  <option value="notempty">is not empty</option>
                </select>
              }
              <button type="button" class="btn btn-ghost btn-xs" (click)="removeItem(i)">Remove</button>
            </div>
          }

          @if (isGroup(item)) {
            <div class="ml-4">
              <pc-tag-rule-builder
                [group]="asGroup(item)"
                [tagSvc]="tagSvc"
                [objectType]="objectType"
                [showSummary]="false"
                (changed)="emitChange()"
              ></pc-tag-rule-builder>
              <div class="mt-1">
                <button type="button" class="btn btn-ghost btn-xs" (click)="removeItem(i)">Remove group</button>
              </div>
            </div>
          }
        }
      </div>
    </div>
  `,
})
export class TagRuleBuilderComponent {
  @Output() public changed = new EventEmitter<void>();
  @Input({ required: true }) public group!: TagGroup;
  @Input({ required: false }) public objectType: 'people' | 'households' = 'people';
  @Input() public showSummary: boolean = true;
  @Input({ required: true }) public tagSvc!: TagsService;
  @Input() public summaryMatches: number | null = null;
  @Input() public summaryCounting: boolean = false;
  @Input() public summaryError: string | null = null;

  public addGroup() {
    this.group.items.push({ kind: 'group', bool: 'and', items: [] });
    this.emitChange();
  }

  public addRule() {
    this.group.items.push({ kind: 'rule', field: 'tag', op: 'eq', value: '' });
    this.emitChange();
  }

  public asGroup(item: TagRuleItem): TagGroup {
    return item as TagGroup;
  }

  public emitChange() {
    this.changed.emit();
  }

  public getField(item: TagRuleItem): RuleField {
    return this.isRule(item) ? (item as Rule).field : 'tag';
  }

  public getOp(item: TagRuleItem): RuleOp {
    return this.isRule(item) ? (item as Rule).op : 'eq';
  }

  public getValue(item: TagRuleItem): string {
    return this.isRule(item) ? (item as Rule).value || '' : '';
  }

  public isGroup(item: TagRuleItem): item is TagGroup {
    return (item as any).kind === 'group';
  }

  // Helpers for template typing
  public isRule(item: TagRuleItem): item is Rule {
    return (item as any).kind === 'rule';
  }

  public removeItem(index: number) {
    this.group.items.splice(index, 1);
    this.emitChange();
  }

  public setBool(bool: 'and' | 'or') {
    this.group.bool = bool;
    this.emitChange();
  }

  public setField(index: number, value: string) {
    const item = this.group.items[index];
    if (this.isRule(item)) {
      const rule = item as Rule;
      rule.field = value === 'email' || value === 'mobile' ? (value as RuleField) : 'tag';
      // reset op/value for chosen field
      if (rule.field === 'tag') {
        rule.op = 'eq';
        rule.value = '';
      } else {
        rule.op = 'empty';
        rule.value = undefined;
      }
      this.emitChange();
    }
  }

  public setOp(index: number, value: string) {
    const item = this.group.items[index];
    if (this.isRule(item)) {
      const rule = item as Rule;
      if (rule.field === 'tag') {
        rule.op = value === 'neq' ? 'neq' : 'eq';
      } else {
        rule.op = value === 'notempty' ? 'notempty' : 'empty';
      }
      this.emitChange();
    }
  }

  public setRuleValue(index: number, value: string) {
    const item = this.group.items[index];
    if (this.isRule(item)) {
      (item as Rule).value = value;
      this.emitChange();
    }
  }

  // Summary helpers
  public summarizeGroup(group: TagGroup): string {
    if (!group.items?.length) return '(Everyone)';
    const parts = group.items.map((item) => this.summarizeItem(item));
    const joiner = ` ${group.bool.toUpperCase()} `;
    return `(${parts.join(joiner)})`;
  }

  private summarizeItem(item: TagRuleItem): string {
    if (this.isRule(item)) {
      const r = item as Rule;
      if (r.field === 'tag') {
        const v = r.value || '…';
        const op = r.op === 'neq' ? 'is not' : 'is';
        return `(tag ${op} '${v}')`;
      }
      const prop = r.field;
      const txt = r.op === 'notempty' ? 'is not empty' : 'is empty';
      return `(${prop} ${txt})`;
    }
    return this.summarizeGroup(item as TagGroup);
  }
}

export type RuleField = 'tag' | 'email' | 'mobile';

export type RuleOp = 'eq' | 'neq' | 'empty' | 'notempty';

export type TagRuleItem = Rule | TagGroup;
