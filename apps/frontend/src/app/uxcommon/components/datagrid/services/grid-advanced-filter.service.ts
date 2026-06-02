import { computed, signal } from '@angular/core';
import type { ColumnDef as ColDef } from '../grid-defaults';

export interface AdvancedFilterRule {
  id: string;
  field: string;
  op: string;
  value: string;
}

export interface AdvancedFilterModel {
  conjunction: 'AND' | 'OR';
  rules: { field: string; op: string; value: string }[];
}

export class GridAdvancedFilterService {
  // ── Signals ───────────────────────────────────────────────────────────────
  readonly showAdvancedFilterBuilder = signal<boolean>(false);
  readonly advConjunction = signal<'AND' | 'OR'>('AND');
  readonly advRules = signal<AdvancedFilterRule[]>([]);

  // ── Computeds ─────────────────────────────────────────────────────────────
  readonly hasActiveAdvancedFilters = computed(() =>
    this.advRules().some(
      (r) => {
        if (!r.field) return false;
        if (r.op === 'isEmpty' || r.op === 'isNotEmpty') return true;
        return r.value !== undefined && r.value !== null && String(r.value).trim() !== '';
      },
    ),
  );

  /**
   * Returns the current filter model for use in API requests, or `undefined`
   * if there are no active rules.
   */
  buildModel(): AdvancedFilterModel | undefined {
    if (!this.hasActiveAdvancedFilters()) return undefined;
    return {
      conjunction: this.advConjunction(),
      rules: this.advRules()
        .filter((r) => {
          if (!r.field) return false;
          if (r.op === 'isEmpty' || r.op === 'isNotEmpty') return true;
          return r.value !== undefined && r.value !== null && String(r.value).trim() !== '';
        })
        .map((r) => ({
          field: r.field,
          op: r.op,
          value: r.op === 'isEmpty' || r.op === 'isNotEmpty' ? '' : r.value,
        })),
    };
  }

  // ── Actions ───────────────────────────────────────────────────────────────

  openAdvancedFilterBuilder(getColDefs: () => ColDef[]): void {
    this.showAdvancedFilterBuilder.set(true);
    if (this.advRules().length === 0) {
      this.addRule(getColDefs);
    }
  }

  /**
   * Called when switching from the panel filter to the advanced filter builder.
   * Closes the panel filter first, then opens the builder.
   */
  switchToAdvancedFilter(closeFilterPanel: () => void, getColDefs: () => ColDef[]): void {
    closeFilterPanel();
    this.openAdvancedFilterBuilder(getColDefs);
  }

  addRule(getColDefs: () => ColDef[]): void {
    const fields = getColDefs().filter((c) => c.field && c.field !== 'actions');
    const defaultField = fields[0]?.field || '';
    const newRule: AdvancedFilterRule = {
      id: Math.random().toString(36).substring(2),
      field: defaultField,
      op: 'contains',
      value: '',
    };
    this.advRules.update((rules) => [...rules, newRule]);
  }

  removeRule(id: string): void {
    this.advRules.update((rules) => rules.filter((r) => r.id !== id));
  }

  updateRule(id: string, updates: Partial<{ field: string; op: string; value: string }>): void {
    this.advRules.update((rules) => rules.map((r) => (r.id === id ? { ...r, ...updates } : r)));
  }

  apply(doRefresh: () => void): void {
    this.showAdvancedFilterBuilder.set(false);
    doRefresh();
  }

  clear(doRefresh: () => void): void {
    this.advConjunction.set('AND');
    this.advRules.set([]);
    this.showAdvancedFilterBuilder.set(false);
    doRefresh();
  }
}
