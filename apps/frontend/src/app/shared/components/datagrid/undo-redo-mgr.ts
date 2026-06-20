import { computed, signal } from '@angular/core';

export class UndoManager {
  private readonly redoSize = signal(0);
  private readonly undoSize = signal(0);
  private readonly isOperating = signal(false);

  private undoStack: any[] = [];
  private redoStack: any[] = [];
  private grid: any = null;

  public readonly canRedo = computed(() => this.redoSize() > 0 && !this.isOperating());
  public readonly canUndo = computed(() => this.undoSize() > 0 && !this.isOperating());

  public getRedoSize(): number {
    return this.redoStack.length;
  }

  public getUndoSize(): number {
    return this.undoStack.length;
  }

  public initialize(_api: any): void {
    this.grid = _api;
    this.isOperating.set(false);
    this.updateSizes();
  }

  public pushUndo(snapshot: any): void {
    this.undoStack.push(snapshot);
    if (this.undoStack.length > 50) {
      this.undoStack.shift();
    }
    this.redoStack = [];
    this.updateSizes();
  }

  public async redo() {
    if (this.isOperating()) return;
    if (this.redoStack.length === 0 || !this.grid) return;

    this.isOperating.set(true);
    try {
      const target = this.redoStack.pop();
      const current = this.captureCurrentState();
      if (current && target.editMeta) {
        current.editMeta = target.editMeta;
      }

      this.undoStack.push(current);
      if (this.undoStack.length > 50) {
        this.undoStack.shift();
      }

      await this.applySnapshot(target, 'redo');
    } finally {
      this.isOperating.set(false);
      this.updateSizes();
    }
  }

  public async undo() {
    if (this.isOperating()) return;
    if (this.undoStack.length === 0 || !this.grid) return;

    this.isOperating.set(true);
    try {
      const target = this.undoStack.pop();
      const current = this.captureCurrentState();
      if (current && target.editMeta) {
        current.editMeta = target.editMeta;
      }

      this.redoStack.push(current);
      if (this.redoStack.length > 50) {
        this.redoStack.shift();
      }

      await this.applySnapshot(target, 'undo');
    } finally {
      this.isOperating.set(false);
      this.updateSizes();
    }
  }

  public updateSizes() {
    this.undoSize.set(this.getUndoSize());
    this.redoSize.set(this.getRedoSize());
  }

  private captureCurrentState(): any {
    const store = this.grid?.store;
    if (!store) return null;

    let rowsCopy: any[] = [];
    try {
      rowsCopy = JSON.parse(JSON.stringify(store.rows() || []));
    } catch {
      rowsCopy = (store.rows() || []).map((r: any) => {
        const copy = { ...r };
        if (Array.isArray(r.tags)) copy.tags = [...r.tags];
        if (Array.isArray(r.issues)) copy.issues = [...r.issues];
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

  private async applySnapshot(target: any, actionType: 'undo' | 'redo') {
    if (!target || !this.grid || !this.grid.store) return;
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
      // Fallback: diff current and target rows when metadata is not present
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

  private findRowsDiff(oldRows: any[], newRows: any[]): { id: string; field: string; prevValue: any; newValue: any }[] {
    const diffs: { id: string; field: string; prevValue: any; newValue: any }[] = [];
    const oldMap = new Map<string, any>();
    for (const r of oldRows) {
      if (r && r.id) oldMap.set(String(r.id), r);
    }
    for (const r of newRows) {
      if (!r || !r.id) continue;
      const idStr = String(r.id);
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
