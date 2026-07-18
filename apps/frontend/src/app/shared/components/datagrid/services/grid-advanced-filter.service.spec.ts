import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GridAdvancedFilterService } from './grid-advanced-filter.service';
import type { ColumnDef } from '../grid-defaults';
import type { QueryBuilderGroupNode, QueryBuilderRuleNode } from '../../../../../../../../libs/common/src';

let seq = 0;

function rule(overrides: Partial<QueryBuilderRuleNode>): QueryBuilderRuleNode {
  return { kind: 'rule', id: `r${++seq}`, field: 'name', op: 'contains', value: 'x', ...overrides };
}

function group(rules: QueryBuilderGroupNode['rules'], conjunction: 'AND' | 'OR' = 'AND'): QueryBuilderGroupNode {
  return { kind: 'group', id: `g${++seq}`, conjunction, rules };
}

describe('GridAdvancedFilterService', () => {
  let service: GridAdvancedFilterService;

  beforeEach(() => {
    service = new GridAdvancedFilterService();
  });

  const setRoot = (rules: QueryBuilderGroupNode['rules']) => {
    service.advFilterRoot.set({ kind: 'group', id: 'root', conjunction: 'AND', rules });
  };

  describe('hasActiveAdvancedFilters', () => {
    it('is false for the pristine empty root', () => {
      expect(service.hasActiveAdvancedFilters()).toBe(false);
    });

    it('ignores rules with no field or a blank value', () => {
      setRoot([
        rule({ field: '' }),
        rule({ value: '' }),
        rule({ value: '   ' }),
        rule({ value: null }),
        rule({ value: undefined }),
      ]);
      expect(service.hasActiveAdvancedFilters()).toBe(false);
    });

    it('treats falsy-but-meaningful values (0, false) as active', () => {
      setRoot([rule({ value: 0 })]);
      expect(service.hasActiveAdvancedFilters()).toBe(true);

      setRoot([rule({ value: false })]);
      expect(service.hasActiveAdvancedFilters()).toBe(true);
    });

    it.each(['isEmpty', 'isNotEmpty', 'empty', 'notempty'])('counts a valueless %s rule as active', (op) => {
      setRoot([rule({ op, value: undefined })]);
      expect(service.hasActiveAdvancedFilters()).toBe(true);
    });

    it('finds an active rule nested two groups deep', () => {
      setRoot([group([group([rule({ value: 'deep' })], 'OR')])]);
      expect(service.hasActiveAdvancedFilters()).toBe(true);
    });

    it('is false when every nested rule is inactive', () => {
      setRoot([group([group([rule({ value: '' })])])]);
      expect(service.hasActiveAdvancedFilters()).toBe(false);
    });
  });

  describe('buildModel', () => {
    it('returns undefined when nothing is active', () => {
      setRoot([rule({ value: '' })]);
      expect(service.buildModel()).toBeUndefined();
    });

    it('drops inactive rules but keeps active siblings and their nesting', () => {
      const active = rule({ field: 'city', value: 'Springfield' });
      const nestedActive = rule({ field: 'name', value: 'a' });
      setRoot([active, rule({ value: '' }), group([nestedActive, rule({ field: '' })], 'OR')]);

      const model = service.buildModel();
      expect(model).toBeDefined();
      expect(model?.conjunction).toBe('AND');
      expect(model?.rules).toHaveLength(2);
      expect(model?.rules[0]).toMatchObject({ field: 'city', value: 'Springfield' });
      expect(model?.rules[1]).toMatchObject({ kind: 'group', conjunction: 'OR' });
      expect((model?.rules[1] as QueryBuilderGroupNode).rules).toEqual([expect.objectContaining({ field: 'name' })]);
    });

    it('prunes a group whose children all clean away', () => {
      setRoot([rule({ field: 'city', value: 'x' }), group([rule({ value: '' }), rule({ field: '' })])]);

      const model = service.buildModel();
      expect(model?.rules).toHaveLength(1);
      expect(model?.rules[0]).toMatchObject({ field: 'city' });
    });

    it('normalizes empty-op rules to an empty-string value', () => {
      setRoot([rule({ op: 'isEmpty', value: 'stale junk' })]);

      const model = service.buildModel();
      expect(model?.rules[0]).toMatchObject({ op: 'isEmpty', value: '' });
    });

    it('does not mutate the underlying tree while building', () => {
      setRoot([rule({ field: 'city', value: 'x' }), rule({ value: '' })]);
      const before = JSON.parse(JSON.stringify(service.advFilterRoot()));

      service.buildModel();

      expect(service.advFilterRoot()).toEqual(before);
    });
  });

  describe('addRule', () => {
    const colDefs: ColumnDef[] = [
      { field: 'actions', headerName: 'Actions' },
      { headerName: 'No field' },
      { field: 'name', headerName: 'Name' },
    ];

    it('defaults the new rule to the first real (non-actions) column', () => {
      service.addRule(() => colDefs);

      const added = service.advFilterRoot().rules[0] as QueryBuilderRuleNode;
      expect(added).toMatchObject({ kind: 'rule', field: 'name', op: 'contains', value: '' });
    });

    it('falls back to an empty field when no usable column exists', () => {
      service.addRule(() => [{ field: 'actions', headerName: 'Actions' }]);

      expect((service.advFilterRoot().rules[0] as QueryBuilderRuleNode).field).toBe('');
    });
  });

  describe('openAdvancedFilterBuilder', () => {
    it('seeds exactly one starter rule, but only when the tree is empty', () => {
      const getColDefs = () => [{ field: 'name', headerName: 'Name' }] as ColumnDef[];

      service.openAdvancedFilterBuilder(getColDefs);
      expect(service.showAdvancedFilterBuilder()).toBe(true);
      expect(service.advFilterRoot().rules).toHaveLength(1);

      service.openAdvancedFilterBuilder(getColDefs);
      expect(service.advFilterRoot().rules).toHaveLength(1); // idempotent
    });
  });

  describe('apply / clear', () => {
    it('apply closes the builder and refreshes without touching the tree', () => {
      setRoot([rule({ value: 'keep me' })]);
      service.showAdvancedFilterBuilder.set(true);
      const doRefresh = vi.fn();

      service.apply(doRefresh);

      expect(service.showAdvancedFilterBuilder()).toBe(false);
      expect(doRefresh).toHaveBeenCalledTimes(1);
      expect(service.advFilterRoot().rules).toHaveLength(1);
    });

    it('clear resets to an empty AND root, closes the builder, and refreshes', () => {
      setRoot([rule({ value: 'x' })]);
      service.showAdvancedFilterBuilder.set(true);
      const doRefresh = vi.fn();

      service.clear(doRefresh);

      expect(service.advFilterRoot()).toEqual({ kind: 'group', id: 'root', conjunction: 'AND', rules: [] });
      expect(service.showAdvancedFilterBuilder()).toBe(false);
      expect(doRefresh).toHaveBeenCalledTimes(1);
    });
  });
});
