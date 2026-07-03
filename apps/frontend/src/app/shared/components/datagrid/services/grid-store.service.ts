import { Injectable, computed, effect, signal, untracked, linkedSignal } from '@angular/core';
import type { GridRow } from '../types';

@Injectable()
export class GridStoreService {
  public grid?: any;
  readonly rows = signal<GridRow[]>([]);
  readonly sorting = signal<any[]>([]);
  readonly colVisibility = signal<Record<string, boolean>>({});
  readonly colWidths = signal<Record<string, number>>({});
  readonly filterValues = signal<Record<string, any>>({});
  readonly panelFilters = signal<Record<string, { op: string; value: any }>>({});
  readonly selectedIdSet = linkedSignal<Record<string, any>, Set<string>>({
    source: () => this.filterValues(),
    computation: () => new Set<string>(),
  });
  readonly allSelected = linkedSignal<Record<string, any>, boolean>({
    source: () => this.filterValues(),
    computation: () => false,
  });
  readonly allSelectedIdSet = linkedSignal<Record<string, any>, Set<string>>({
    source: () => this.filterValues(),
    computation: () => new Set<string>(),
  });
  readonly allSelectedIds = linkedSignal<Record<string, any>, string[]>({
    source: () => this.filterValues(),
    computation: () => [],
  });
  readonly allSelectedCount = linkedSignal<Record<string, any>, number>({
    source: () => this.filterValues(),
    computation: () => 0,
  });
  readonly selectionStickyWidth = signal<number>(48);
  readonly pageIndex = signal<number>(0);
  readonly pageSize = signal<number>(25);

  readonly displayedCount = computed(() => this.rows().length);

  readonly editCommitCount = signal<number>(0);
  private _lastSnapshot: any = null;

  public recordSnapshotBeforeCommit(id: string, field: string, prevValue: any, newValue: any) {
    let rowsCopy: any[] = [];
    try {
      rowsCopy = JSON.parse(JSON.stringify(this.rows() || []));
    } catch {
      rowsCopy = (this.rows() || []).map((r: any) => {
        const copy = { ...r };
        if (Array.isArray(r.tags)) copy.tags = [...r.tags];
        if (Array.isArray(r.issues)) copy.issues = [...r.issues];
        return copy;
      });
    }

    const getRowId = this._getRowId || ((r: any) => String(r?.id || ''));
    rowsCopy = rowsCopy.map((r: any) => {
      if (getRowId(r) === id) {
        return { ...r, [field]: prevValue };
      }
      return r;
    });

    this._lastSnapshot = {
      rows: rowsCopy,
      selectedIdSet: new Set(this.selectedIdSet()),
      filterValues: { ...this.filterValues() },
      sorting: [...this.sorting()],
      pageIndex: this.pageIndex(),
      pageSize: this.pageSize(),
      editMeta: {
        id,
        field,
        prevValue,
        newValue,
      },
    };
    this.editCommitCount.update((c) => c + 1);
  }

  private _persistKey = signal<string>('');
  private _persistTick = signal<number>(0);
  private _table: any = null;
  private _getRowId: ((row: any) => string) | null = null;

  constructor() {
    effect(() => {
      const count = this.editCommitCount();
      if (count === 0) return;

      untracked(() => {
        if (this._lastSnapshot && this.grid?.undoMgr) {
          this.grid.undoMgr.pushUndo(this._lastSnapshot);
          this._lastSnapshot = null;
        }
      });
    });

    effect(() => {
      const key = this._persistKey();
      this.sorting();
      this.colVisibility();
      this.filterValues();
      this.selectionStickyWidth();
      this.colWidths();
      this.pageSize();
      this._persistTick();
      if (!key) return;
      try {
        const st = (this._table?.getState?.() ?? {}) as unknown as {
          sorting?: any[];
          columnVisibility?: Record<string, boolean>;
          columnPinning?: { left: string[]; right: string[] };
          columnSizing?: Record<string, number>;
          columnOrder?: string[];
        };
        const data = {
          sorting: st.sorting || this.sorting(),
          visibility: st.columnVisibility || this.colVisibility(),
          pinning: st.columnPinning || { left: [], right: [] },
          sizing: st.columnSizing || this.colWidths(),
          order: st.columnOrder || [],
          filters: this.filterValues() || {},
          selectionWidth: this.selectionStickyWidth(),
          pageSize: this.pageSize(),
        };
        localStorage.setItem(key, JSON.stringify(data));
      } catch {}
    });

    // Attempt to load persisted state whenever key changes
    effect(() => {
      const key = this._persistKey();
      if (!key) return;
      this._loadFromStorage(key);
    });

    effect(() => {
      const v = this.colVisibility();
      if (this._table) {
        try {
          this._table.setOptions((prev: any) => ({ ...prev, state: { ...prev.state, columnVisibility: v } }));
        } catch {}
      }
    });

    // Sync sorting state
    effect(() => {
      const s = this.sorting();
      if (this._table) {
        try {
          this._table.setOptions((prev: any) => ({ ...prev, state: { ...prev.state, sorting: s } }));
        } catch {}
      }
    });

    // Sync column sizing
    effect(() => {
      const sizing = this.colWidths();
      if (this._table) {
        try {
          this._table.setOptions((prev: any) => ({ ...prev, state: { ...prev.state, columnSizing: sizing } }));
        } catch {}
      }
    });

    // Sync data
    effect(() => {
      const r = this.rows();
      if (this._table) {
        try {
          this._table.setOptions((prev: any) => ({ ...prev, data: r }));
        } catch {}
      }
    });

    // Sync row selection map for current rows
    effect(() => {
      const rows = this.rows();
      const ids = this.selectedIdSet();
      if (!this._table || !this._getRowId) return;
      try {
        const map: Record<string, boolean> = {};
        for (const r of rows) {
          const id = this._getRowId(r);
          if (id && ids.has(id)) map[id] = true;
        }
        this._table.setOptions((prev: any) => ({ ...prev, state: { ...prev.state, rowSelection: map } }));
      } catch {}
    });
  }

  setPersistKey(key: string) {
    this._persistKey.set(key || '');
  }

  attachTable(table: any) {
    this._table = table;
  }

  setGetRowId(fn: (row: any) => string) {
    this._getRowId = fn;
  }

  requestPersist() {
    this._persistTick.update((v) => (v + 1) | 0);
  }

  loadState() {
    const key = this._persistKey();
    if (!key) return;
    this._loadFromStorage(key);
  }

  private _loadFromStorage(key: string) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return;
      type Persisted = {
        sorting?: any[];
        visibility?: Record<string, boolean>;
        filters?: Record<string, any>;
        selectionWidth?: number;
        sizing?: Record<string, number>;
        pinning?: { left: string[]; right: string[] };
        order?: string[];
        pageSize?: number;
      };
      const data = JSON.parse(raw || '{}') as unknown as Persisted;
      if (data.sorting) this.sorting.set(data.sorting);
      if (data.visibility) this.colVisibility.set({ ...untracked(() => this.colVisibility()), ...data.visibility });
      if (data.filters) this.filterValues.set(data.filters);
      if (typeof data.selectionWidth === 'number') this.selectionStickyWidth.set(data.selectionWidth);
      if (typeof data.pageSize === 'number' && data.pageSize > 0) this.pageSize.set(data.pageSize);
      const sizing = data.sizing || {};
      queueMicrotask(() => {
        if (this._table?.setOptions) {
          this._table.setOptions((prev: any) => ({
            ...prev,
            state: {
              ...prev.state,
              sorting: data.sorting || prev.state?.sorting,
              columnVisibility: data.visibility || prev.state?.columnVisibility,
              columnPinning: data.pinning || prev.state?.columnPinning,
              columnSizing: sizing || prev.state?.columnSizing,
              columnOrder: data.order || prev.state?.columnOrder,
            },
          }));
        }
        this.colWidths.set({ ...(sizing || {}) });
      });
    } catch {}
  }
}
