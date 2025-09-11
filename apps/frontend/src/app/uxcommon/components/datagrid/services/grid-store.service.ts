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
  }

  setPersistKey(key: string) {
    this._persistKey.set(key || '');
  }

  attachTable(table: any) {
    this._table = table;
  }
}
