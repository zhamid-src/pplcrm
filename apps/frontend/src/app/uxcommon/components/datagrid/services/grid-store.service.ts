import { Injectable, computed, effect, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class GridStoreService {
  readonly rows = signal<any[]>([]);
  readonly sorting = signal<any[]>([]);
  readonly colVisibility = signal<Record<string, boolean>>({});
  readonly colWidths = signal<Record<string, number>>({});
  readonly filterValues = signal<Record<string, any>>({});
  readonly panelFilters = signal<Record<string, { op: 'contains' | 'equals'; value: any }>>({});
  readonly selectedIdSet = signal<Set<string>>(new Set());
  readonly allSelected = signal<boolean>(false);
  readonly allSelectedIdSet = signal<Set<string>>(new Set());
  readonly allSelectedIds = signal<string[]>([]);
  readonly allSelectedCount = signal<number>(0);
  readonly selectionStickyWidth = signal<number>(48);
  readonly pageIndex = signal<number>(0);

  readonly displayedCount = computed(() => this.rows().length);

  private _persistKey = signal<string>('');
  private _table: any = null;
  private _getRowId: ((row: any) => string) | null = null;

  constructor() {
    effect(() => {
      const key = this._persistKey();
      this.sorting();
      this.colVisibility();
      this.filterValues();
      this.selectionStickyWidth();
      this.colWidths();
      if (!key) return;
      try {
        const st: any = this._table?.getState?.() ?? {};
        const data = {
          sorting: st.sorting || this.sorting(),
          visibility: st.columnVisibility || this.colVisibility(),
          pinning: st.columnPinning || { left: [], right: [] },
          sizing: st.columnSizing || this.colWidths(),
          order: st.columnOrder || [],
          filters: this.filterValues() || {},
          selectionWidth: this.selectionStickyWidth(),
        } as any;
        localStorage.setItem(key, JSON.stringify(data));
      } catch {}
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
}
