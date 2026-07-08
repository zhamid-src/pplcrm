import { computed, signal } from '@angular/core';
import type { GridHost, GridRow, GridSnapshot } from './types';

export class UndoManager {
  private readonly isOperating = signal(false);

  private readonly undoStack = signal<GridSnapshot[]>([]);
  private readonly redoStack = signal<GridSnapshot[]>([]);
  private grid: GridHost | null = null;

  public readonly canRedo = computed(() => this.redoStack().length > 0 && !this.isOperating());
  public readonly canUndo = computed(() => this.undoStack().length > 0 && !this.isOperating());

  public getRedoSize(): number {
    return this.redoStack().length;
  }

  public getUndoSize(): number {
    return this.undoStack().length;
  }

  public initialize(api: GridHost): void {
    this.grid = api;
    this.isOperating.set(false);
  }

  public pushUndo(snapshot: GridSnapshot): void {
    this.undoStack.update((s) => {
      const next = [...s, snapshot];
      return next.length > 50 ? next.slice(1) : next;
    });
    this.redoStack.set([]);
  }

  public async redo() {
    const redoStack = this.redoStack();
    if (this.isOperating() || redoStack.length === 0 || !this.grid) return;

    const target = redoStack[redoStack.length - 1];
    if (!target) return;

    this.isOperating.set(true);
    try {
      this.redoStack.update((s) => s.slice(0, -1));

      const current = this.captureCurrentState();
      if (current && target.editMeta) {
        current.editMeta = target.editMeta;
      }
      if (current) {
        this.undoStack.update((s) => {
          const next = [...s, current];
          return next.length > 50 ? next.slice(1) : next;
        });
      }

      await this.applySnapshot(target, 'redo');
    } finally {
      this.isOperating.set(false);
    }
  }

  public async undo() {
    const undoStack = this.undoStack();
    if (this.isOperating() || undoStack.length === 0 || !this.grid) return;

    const target = undoStack[undoStack.length - 1];
    if (!target) return;

    this.isOperating.set(true);
    try {
      this.undoStack.update((s) => s.slice(0, -1));

      const current = this.captureCurrentState();
      if (current && target.editMeta) {
        current.editMeta = target.editMeta;
      }
      if (current) {
        this.redoStack.update((s) => {
          const next = [...s, current];
          return next.length > 50 ? next.slice(1) : next;
        });
      }

      await this.applySnapshot(target, 'undo');
    } finally {
      this.isOperating.set(false);
    }
  }

  private captureCurrentState(): GridSnapshot | null {
    const store = this.grid?.store;
    if (!store) return null;

    let rowsCopy: GridRow[] = [];
    try {
      rowsCopy = JSON.parse(JSON.stringify(store.rows() || [])) as GridRow[];
    } catch {
      rowsCopy = (store.rows() || []).map((r) => {
        const copy: GridRow = { ...r };
        if (Array.isArray(r['tags'])) copy['tags'] = [...(r['tags'] as unknown[])];
        if (Array.isArray(r['issues'])) copy['issues'] = [...(r['issues'] as unknown[])];
        return copy;
      });
    }

    return {
      rows: rowsCopy,
      selectedIdSet: new Set(store.selectedIdSet()),
      filterValues: { ...store.filterValues() },
      sorting: [...store.sorting()],
      pageIndex: store.pageIndex(),
      pageSize: store.pageSize(),
    };
  }

  private async applySnapshot(target: GridSnapshot, actionType: 'undo' | 'redo') {
    if (!this.grid || !this.grid.store) return;
    const store = this.grid.store;
    const flashedCells: { id: string; field: string }[] = [];

    if (target.editMeta) {
      try {
        const { id, field, prevValue, newValue } = target.editMeta;
        const valToSet = actionType === 'undo' ? prevValue : newValue;
        const payload = { [field]: valToSet };
        await this.grid.gridSvc.update(id, payload);
        flashedCells.push({ id: String(id), field });
      } catch (err) {
        console.error(`Failed to update backend on ${actionType}:`, err);
        if (this.grid.alertSvc) {
          this.grid.alertSvc.showError('Reverting changes on the server failed');
        }
      }
    } else {
      try {
        const currentRows = store.rows() || [];
        const diffs = this.findRowsDiff(currentRows, target.rows);
        for (const diff of diffs) {
          const payload = { [diff.field]: diff.newValue };
          await this.grid.gridSvc.update(diff.id, payload);
          flashedCells.push({ id: String(diff.id), field: diff.field });
        }
      } catch (err) {
        console.error(`Failed to update backend on ${actionType} fallback:`, err);
      }
    }

    store.rows.set(target.rows);
    store.selectedIdSet.set(target.selectedIdSet);
    store.filterValues.set(target.filterValues);
    store.sorting.set(target.sorting);
    store.pageIndex.set(target.pageIndex);
    store.pageSize.set(target.pageSize);

    this.grid.updateTableWindow(this.grid.startIndex(), this.grid.endIndex());

    for (const item of flashedCells) {
      if (typeof this.grid.triggerCellFlash === 'function') {
        this.grid.triggerCellFlash(item.id, item.field);
      }
    }
  }

  private findRowsDiff(
    oldRows: GridRow[],
    newRows: GridRow[],
  ): { id: string; field: string; prevValue: unknown; newValue: unknown }[] {
    const diffs: { id: string; field: string; prevValue: unknown; newValue: unknown }[] = [];
    const oldMap = new Map<string, GridRow>();
    for (const r of oldRows) {
      if (r && r['id']) oldMap.set(String(r['id']), r);
    }
    for (const r of newRows) {
      if (!r || !r['id']) continue;
      const idStr = String(r['id']);
      const oldRow = oldMap.get(idStr);
      if (oldRow) {
        for (const key of Object.keys(r)) {
          if (key === 'id') continue;
          const val1 = oldRow[key];
          const val2 = r[key];
          if (JSON.stringify(val1) !== JSON.stringify(val2)) {
            diffs.push({ id: idStr, field: key, prevValue: val1, newValue: val2 });
          }
        }
      }
    }
    return diffs;
  }
}
