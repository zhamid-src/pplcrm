import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class EditingController {
  public coerceEditingValue(col: { cellDataType?: string }, raw: any): any {
    const t = String(col?.cellDataType || '').toLowerCase();
    if (t === 'number' || t === 'numeric') {
      const n = typeof raw === 'number' ? raw : parseFloat(String(raw ?? '').trim());
      return isNaN(n) ? null : n;
    }
    if (t === 'date' || t === 'datetime' || t === 'dateonly') {
      const v = String(raw ?? '').trim();
      return v.length > 10 ? v.slice(0, 10) : v;
    }
    return raw;
  }

  public async commitSingleCell(opts: {
    row: any;
    col: { field?: string; cellDataType?: string; valueSetter?: (p: any) => boolean };
    currentValue: any;
    toId: (row: any) => string;
    createPayload: (row: any, key: string) => any;
    applyEdit: (id: string, data: any) => Promise<boolean>;
    updateEditedRowInCaches: (id: string, field: string | undefined, value: any) => void;
    updateTableWindow: (start: number, end: number) => void;
    startIndex: () => number;
    endIndex: () => number;
    showSuccess: (msg: string) => void;
    showError: (msg: string) => void;
    undo: () => void;
  }): Promise<boolean> {
    const { row, col, currentValue, toId } = opts;
    if (!col.field) return false;
    const id = toId(row);
    if (!id) return false;
    const key = col.field as string;
    const prev = (row as Record<string, unknown>)[key];
    // If a valueSetter is provided on the col, let it handle assignment/normalization
    let changed = false;
    const before: Record<string, unknown> = { ...(row || {}) };
    if (typeof opts.col.valueSetter === 'function') {
      try {
        // Provide a best-effort AG-like params object
        const didSet = opts.col.valueSetter({ data: row, newValue: opts.currentValue, value: prev, colDef: opts.col });
        changed = !!didSet;
      } catch {
        changed = false;
      }
    } else {
      const equal =
        prev === opts.currentValue || (prev == null && (opts.currentValue == null || opts.currentValue === ''));
      changed = !equal;
      if (changed) Object.assign(row as object, { [key]: opts.currentValue });
    }
    if (!changed) return true;
    try {
      if (this.shouldBlockEdit(row, key)) {
        opts.undo();
        opts.showError('Editing this field is blocked');
        Object.assign(row as object, { [key]: before[key] });
        return false;
      }
      const payload = opts.createPayload(row, key);
      const edited = await opts.applyEdit(id, payload);
      if (!edited) {
        opts.undo();
        Object.assign(row as object, { [key]: before[key] });
        opts.showError('Update failed');
        return false;
      }
      opts.updateEditedRowInCaches(id, col.field, currentValue);
      opts.updateTableWindow(opts.startIndex(), opts.endIndex());
      opts.showSuccess('Row updated');
      return true;
    } catch {
      Object.assign(row as object, { [key]: before[key] });
      opts.showError('Update failed');
      return false;
    }
  }

  public shouldBlockEdit(row: any, key: string): boolean {
    return !!(
      row &&
      typeof row === 'object' &&
      'deletable' in row &&
      (row as { deletable?: boolean }).deletable === false &&
      key === 'name'
    );
  }
}
