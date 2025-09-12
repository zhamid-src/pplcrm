import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class EditingController {
  coerceEditingValue(col: { cellDataType?: string }, raw: any): any {
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

  shouldBlockEdit(row: any, key: string): boolean {
    return 'deletable' in (row as any) && (row as any).deletable === false && key === 'name';
  }

  async commitSingleCell(opts: {
    row: any;
    col: { field?: string; cellDataType?: string };
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
    const prev = (row as any)[key as any];
    const equal = prev === currentValue || (prev == null && (currentValue == null || currentValue === ''));
    if (equal) return true;

    const before = { ...(row || {}) } as any;
    (row as any)[key as any] = currentValue;
    try {
      if (this.shouldBlockEdit(row, key)) {
        opts.undo();
        opts.showError('Editing this field is blocked');
        (row as any)[key as any] = before[key as any];
        return false;
      }
      const payload = opts.createPayload(row, key);
      const edited = await opts.applyEdit(id, payload);
      if (!edited) {
        opts.undo();
        (row as any)[key as any] = before[key as any];
        opts.showError('Update failed');
        return false;
      }
      opts.updateEditedRowInCaches(id, col.field, currentValue);
      opts.updateTableWindow(opts.startIndex(), opts.endIndex());
      opts.showSuccess('Row updated');
      return true;
    } catch {
      (row as any)[key as any] = before[key as any];
      opts.showError('Update failed');
      return false;
    }
  }
}

