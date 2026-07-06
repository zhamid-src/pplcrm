import { signal } from '@angular/core';
import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DataGrid } from '../datagrid';
import { AbstractAPIService } from '../../../../services/api/abstract-api.service';
import { DATA_GRID_CONFIG, DEFAULT_DATA_GRID_CONFIG } from '../datagrid.tokens';
import { TagOptionsService } from '../services/tag-options.service';
import type { ColumnDef } from '../grid-defaults';

class MockGridSvc {
  refreshCount = signal(0);
  getAll = vi.fn().mockResolvedValue({ rows: [], count: 0 });
  getAllArchived = vi.fn().mockResolvedValue({ rows: [], count: 0 });
  abort = vi.fn();
  detachTag = vi.fn().mockResolvedValue(undefined);
  update = vi.fn().mockResolvedValue(undefined);
  delete = vi.fn().mockResolvedValue(true);
  deleteMany = vi.fn().mockResolvedValue(true);
  queueExport = vi.fn().mockResolvedValue({});
}

describe('DataGrid', () => {
  let fixture: ComponentFixture<DataGrid<'persons', unknown>>;
  let component: DataGrid<'persons', unknown>;
  let mockGridSvc: MockGridSvc;

  const nameColDef: ColumnDef = { field: 'name', headerName: 'Name' };
  const amountColDef: ColumnDef = {
    field: 'amount',
    headerName: 'Amount',
    valueGetter: (p) => Number((p.data?.['amount'] as number) ?? 0) * 2,
  };
  const colDefs: ColumnDef[] = [nameColDef, amountColDef];

  beforeEach(async () => {
    mockGridSvc = new MockGridSvc();

    await TestBed.configureTestingModule({
      imports: [DataGrid],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: {} },
        // useValue (not useClass) so the component AND its FetchController —
        // which injects AbstractAPIService independently — share this exact
        // instance, letting tests assert on its spies.
        { provide: AbstractAPIService, useValue: mockGridSvc },
        { provide: DATA_GRID_CONFIG, useValue: DEFAULT_DATA_GRID_CONFIG },
        { provide: TagOptionsService, useValue: { getTagNames: vi.fn().mockResolvedValue([]) } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent<DataGrid<'persons', unknown>>(DataGrid);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('colDefs', colDefs);
  });

  async function init() {
    fixture.detectChanges();
    await fixture.whenStable();
    // ngOnInit kicks off a fire-and-forget async IIFE (tag options, optional
    // lists fetch, table build, first page load) that whenStable() does not
    // track; flush its microtask/timer chain manually before asserting.
    for (let i = 0; i < 5; i++) {
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
    fixture.detectChanges();
  }

  describe('callCellRenderer memoization (SECURITY-REVIEW 3.1)', () => {
    it('runs the renderer once per (row, value) and re-runs only when the value changes', () => {
      const renderer = vi.fn((p: { value: unknown }) => `<span>${String(p.value)}</span>`);
      const col = { field: 'name', headerName: 'Name', cellRenderer: renderer } as unknown as ColumnDef;
      const row: Record<string, unknown> = { name: 'Alice' };

      const call = () =>
        (component as unknown as { callCellRenderer: (r: unknown, c: unknown) => unknown }).callCellRenderer(row, col);

      const first = call();
      const second = call();
      expect(renderer).toHaveBeenCalledTimes(1); // second call served from cache
      expect(second).toBe(first); // same SafeHtml reference

      row['name'] = 'Bob'; // value changed -> cache invalidated
      call();
      expect(renderer).toHaveBeenCalledTimes(2);
    });
  });

  describe('initial load', () => {
    it('prepends the selection column to the configured column defs', async () => {
      mockGridSvc.getAll.mockResolvedValue({ rows: [], count: 0 });
      await init();

      const cols = (component as unknown as { colDefsWithEdit: ColumnDef[] }).colDefsWithEdit;
      expect(cols).toHaveLength(3);
      expect(cols[1].field).toBe('name');
      expect(cols[2].field).toBe('amount');
    });

    it('loads the first page and exposes the returned rows and total count', async () => {
      mockGridSvc.getAll.mockResolvedValue({
        rows: [
          { id: '1', name: 'Alice', amount: 10 },
          { id: '2', name: 'Bob', amount: 20 },
        ],
        count: 2,
      });

      await init();

      expect(mockGridSvc.getAll).toHaveBeenCalled();
      expect(component.rows()).toHaveLength(2);
      expect(component.totalCountAll()).toBe(2);
    });

    it('shows the load-failed alert and does not throw when the fetch rejects', async () => {
      mockGridSvc.getAll.mockRejectedValue(new Error('network down'));

      await expect(init()).resolves.toBeUndefined();
      expect(component.rows()).toEqual([]);
    });
  });

  describe('toId', () => {
    it('stringifies the id field of a row', async () => {
      await init();
      expect(component.toId({ id: 5 })).toBe('5');
    });

    it('returns an empty string for rows without an id', async () => {
      await init();
      expect(component.toId({})).toBe('');
      expect(component.toId(null)).toBe('');
    });
  });

  describe('getCellValue', () => {
    it('reads the field directly when no valueGetter is configured', async () => {
      await init();
      const value = (component as unknown as { getCellValue: (r: unknown, c: ColumnDef) => unknown }).getCellValue(
        { name: 'Alice' },
        nameColDef,
      );
      expect(value).toBe('Alice');
    });

    it('uses the valueGetter when one is configured', async () => {
      await init();
      const value = (component as unknown as { getCellValue: (r: unknown, c: ColumnDef) => unknown }).getCellValue(
        { amount: 21 },
        amountColDef,
      );
      expect(value).toBe(42);
    });
  });

  describe('pagination', () => {
    it('computes total pages, canNext and canPrev from the total count and page size', async () => {
      mockGridSvc.getAll.mockResolvedValue({ rows: [], count: 52 });
      await init();

      expect(component.totalCountAll()).toBe(52);
      expect((component as unknown as { totalPages: () => number }).totalPages()).toBe(3);
      expect((component as unknown as { canNext: () => boolean }).canNext()).toBe(true);
      expect((component as unknown as { canPrev: () => boolean }).canPrev()).toBe(false);
    });
  });

  describe('tag filter chips', () => {
    it('adds a chip when a tag filter is toggled on, and removes it via removeFilterChip', async () => {
      await init();

      component.toggleTagFilter('donor', true);
      await fixture.whenStable();

      expect(component.selectedTags()).toContain('donor');
      // OR-ed tags collapse into a single combined chip keyed 'tags' (label names the members).
      const chips = (
        component as unknown as { filterChips: () => { kind: string; key: string; label: string }[] }
      ).filterChips();
      expect(chips).toContainEqual(
        expect.objectContaining({ kind: 'tag', key: 'tags', label: expect.stringContaining('donor') }),
      );

      const chip = chips.find((c) => c.kind === 'tag' && c.key === 'tags');
      if (!chip) throw new Error('expected a combined tag chip to be present');
      (component as unknown as { removeFilterChip: (c: unknown) => void }).removeFilterChip(chip);
      await fixture.whenStable();

      expect(component.selectedTags()).not.toContain('donor');
    });

    it('clearAllFilters resets tag, issue, list and column filters together', async () => {
      await init();

      component.toggleTagFilter('donor', true);
      component.store.filterValues.set({ name: { op: 'contains', value: 'a' } });
      await fixture.whenStable();

      (component as unknown as { clearAllFilters: () => void }).clearAllFilters();
      await fixture.whenStable();

      expect(component.selectedTags()).toEqual([]);
      expect(component.store.filterValues()).toEqual({});
    });
  });

  describe('isColFiltered', () => {
    it('reports true only for fields with an active filter value', async () => {
      await init();
      component.store.filterValues.set({ name: 'foo' });

      expect(component.isColFiltered('name')).toBe(true);
      expect(component.isColFiltered('amount')).toBe(false);
    });
  });

  describe('selection', () => {
    it('tracks single vs. multi selection state via the selected id set', async () => {
      await init();

      component.store.selectedIdSet.set(new Set(['1']));
      expect(component.hasSingleSelection()).toBe(true);

      component.store.selectedIdSet.set(new Set(['1', '2']));
      expect(component.hasSingleSelection()).toBe(false);
      expect(component.getCountRowSelected()).toBe(2);
    });

    it('clearAllSelection resets the select-all-across-pages state', async () => {
      await init();

      component.allSelected.set(true);
      component.allSelectedCount.set(10);

      component.clearAllSelection();

      expect(component.allSelected()).toBe(false);
      expect(component.allSelectedCount()).toBe(0);
    });
  });
});
