import { computed, signal } from '@angular/core';
import type { ColumnDef as ColDef } from '../grid-defaults';
import { QueryBuilderGroupNode, QueryBuilderNode, QueryBuilderRuleNode } from '@common';

export class GridAdvancedFilterService {
  // ── Signals ───────────────────────────────────────────────────────────────
  readonly showAdvancedFilterBuilder = signal<boolean>(false);
  readonly advFilterRoot = signal<QueryBuilderGroupNode>({
    kind: 'group',
    id: 'root',
    conjunction: 'AND',
    rules: [],
  });

  // ── Computeds ─────────────────────────────────────────────────────────────
  readonly hasActiveAdvancedFilters = computed(() => {
    return this.hasActiveRules(this.advFilterRoot());
  });

  private hasActiveRules(node: QueryBuilderNode): boolean {
    if (node.kind === 'rule') {
      if (!node.field) return false;
      if (node.op === 'isEmpty' || node.op === 'isNotEmpty' || node.op === 'empty' || node.op === 'notempty') return true;
      return node.value !== undefined && node.value !== null && String(node.value).trim() !== '';
    } else {
      return node.rules.some((child) => this.hasActiveRules(child));
    }
  }

  /**
   * Returns the current filter model for use in API requests, or `undefined`
   * if there are no active rules.
   */
  buildModel(): QueryBuilderGroupNode | undefined {
    if (!this.hasActiveAdvancedFilters()) return undefined;
    const cleaned = this.cleanFilterTree(this.advFilterRoot());
    if (cleaned && cleaned.kind === 'group') {
      return cleaned;
    }
    return undefined;
  }

  private cleanFilterTree(node: QueryBuilderNode): QueryBuilderNode | null {
    if (node.kind === 'rule') {
      if (!node.field) return null;
      if (node.op === 'isEmpty' || node.op === 'isNotEmpty' || node.op === 'empty' || node.op === 'notempty') {
        return { ...node, value: '' };
      }
      if (node.value !== undefined && node.value !== null && String(node.value).trim() !== '') {
        return { ...node };
      }
      return null;
    } else {
      const activeChildren = node.rules
        .map((child) => this.cleanFilterTree(child))
        .filter((child): child is QueryBuilderNode => child !== null);
      if (activeChildren.length === 0) return null;
      return {
        ...node,
        rules: activeChildren,
      };
    }
  }

  // ── Actions ───────────────────────────────────────────────────────────────

  openAdvancedFilterBuilder(getColDefs: () => ColDef[]): void {
    this.showAdvancedFilterBuilder.set(true);
    if (this.advFilterRoot().rules.length === 0) {
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
    const newRule: QueryBuilderRuleNode = {
      kind: 'rule',
      id: Math.random().toString(36).substring(2),
      field: defaultField,
      op: 'contains',
      value: '',
    };
    this.advFilterRoot.update((root) => ({
      ...root,
      rules: [...root.rules, newRule],
    }));
  }

  apply(doRefresh: () => void): void {
    this.showAdvancedFilterBuilder.set(false);
    doRefresh();
  }

  clear(doRefresh: () => void): void {
    this.advFilterRoot.set({
      kind: 'group',
      id: 'root',
      conjunction: 'AND',
      rules: [],
    });
    this.showAdvancedFilterBuilder.set(false);
    doRefresh();
  }
}
