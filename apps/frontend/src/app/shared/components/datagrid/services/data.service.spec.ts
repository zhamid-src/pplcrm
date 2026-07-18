import { describe, it, expect } from 'vitest';
import { DataGridDataService } from './data.service';

const service = new DataGridDataService();

function baseArgs() {
  return {
    searchStr: '',
    startRow: 0,
    endRow: 25,
    tags: [] as string[],
    filterModel: {},
    sortState: [] as Array<{ id: string; desc?: boolean }>,
    sortCol: null as string | null,
    sortDir: null as 'asc' | 'desc' | null,
  };
}

describe('DataGridDataService', () => {
  describe('buildGetAllOptions — sortModel', () => {
    it('maps sortState entries, defaulting an absent desc flag to asc', () => {
      const options = service.buildGetAllOptions({
        ...baseArgs(),
        sortState: [{ id: 'name', desc: true }, { id: 'city' }],
      });

      expect(options.sortModel).toEqual([
        { colId: 'name', sort: 'desc' },
        { colId: 'city', sort: 'asc' },
      ]);
    });

    it('prefers a non-empty sortState over the sortCol/sortDir pair', () => {
      const options = service.buildGetAllOptions({
        ...baseArgs(),
        sortState: [{ id: 'name', desc: false }],
        sortCol: 'city',
        sortDir: 'desc',
      });

      expect(options.sortModel).toEqual([{ colId: 'name', sort: 'asc' }]);
    });

    it('falls back to sortCol/sortDir when sortState is empty', () => {
      const options = service.buildGetAllOptions({ ...baseArgs(), sortCol: 'city', sortDir: 'desc' });

      expect(options.sortModel).toEqual([{ colId: 'city', sort: 'desc' }]);
    });

    it('produces an empty sort model when only half the sortCol/sortDir pair is set', () => {
      expect(service.buildGetAllOptions({ ...baseArgs(), sortCol: 'city' }).sortModel).toEqual([]);
      expect(service.buildGetAllOptions({ ...baseArgs(), sortDir: 'asc' }).sortModel).toEqual([]);
      expect(service.buildGetAllOptions(baseArgs()).sortModel).toEqual([]);
    });
  });

  describe('buildGetAllOptions — passthrough fidelity', () => {
    it('forwards every filter facet unchanged and normalizes listId null to undefined', () => {
      const advancedFilterModel = {
        kind: 'group' as const,
        id: 'root',
        conjunction: 'AND' as const,
        rules: [{ kind: 'rule' as const, id: 'r1', field: 'name', op: 'contains', value: 'a' }],
      };
      const options = service.buildGetAllOptions({
        ...baseArgs(),
        searchStr: 'alice',
        startRow: 50,
        endRow: 75,
        tags: ['donor', 'volunteer'],
        issues: ['transit'],
        filterModel: { city: { op: 'eq', value: 'Springfield' } },
        includeArchived: true,
        advancedFilterModel,
        listId: null,
      });

      expect(options).toMatchObject({
        searchStr: 'alice',
        startRow: 50,
        endRow: 75,
        tags: ['donor', 'volunteer'],
        issues: ['transit'],
        filterModel: { city: { op: 'eq', value: 'Springfield' } },
        includeArchived: true,
        advancedFilterModel,
      });
      expect(options.listId).toBeUndefined();
    });

    it('passes a real listId through', () => {
      expect(service.buildGetAllOptions({ ...baseArgs(), listId: '7' }).listId).toBe('7');
    });
  });

  describe('computeTotalPages', () => {
    it.each([
      [0, 25, 1], // empty grid still shows one page
      [1, 25, 1],
      [25, 25, 1],
      [26, 25, 2],
      [50, 25, 2],
      [51, 25, 3],
    ])('(%i rows, %i per page) → %i pages', (count, size, pages) => {
      expect(service.computeTotalPages(count, size)).toBe(pages);
    });

    it('guards a zero page size instead of dividing by zero', () => {
      expect(service.computeTotalPages(10, 0)).toBe(10);
    });
  });
});
