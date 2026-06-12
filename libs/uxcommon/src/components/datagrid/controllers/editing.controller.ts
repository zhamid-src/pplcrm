import { Injectable, inject } from '@angular/core';
import type { DataGrid } from '../datagrid';
import { GridStoreService } from '../services/grid-store.service';
import { AlertService } from '@uxcommon/components/alerts/alert-service';
import { DataGridUtilsService } from '../services/utils.service';
import { AbstractAPIService } from '@frontend/services/api/abstract-api.service';

@Injectable()
export class EditingController {
  private readonly store = inject(GridStoreService);
  private readonly alertSvc = inject(AlertService);
  private readonly utilsSvc = inject(DataGridUtilsService);
  private readonly gridSvc = inject(AbstractAPIService);

  private get grid(): DataGrid<any, any> {
    return this.store.grid;
  }

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
    if (t === 'color' || t === 'colour') {
      const v = String(raw ?? '').trim();
      const pattern = /^#([0-9a-fA-F]{6})$/;
      return pattern.test(v) ? v.toLowerCase() : null;
    }
    return raw;
  }

  public async commitSingleCell(
    row: any,
    col: { field?: string; cellDataType?: string; valueSetter?: (p: any) => boolean },
    currentValue: any,
  ): Promise<boolean> {
    if (!col.field) return false;
    const id = this.grid.toId(row);
    if (!id) return false;
    const key = col.field as string;
    const prev = (row as Record<string, unknown>)[key];
    // If a valueSetter is provided on the col, let it handle assignment/normalization
    let changed = false;
    const before: Record<string, unknown> = { ...(row || {}) };
    if (typeof col.valueSetter === 'function') {
      try {
        const didSet = col.valueSetter({ data: row, newValue: currentValue, value: prev, colDef: col });
        changed = !!didSet;
      } catch {
        changed = false;
      }
    } else {
      const equal = prev === currentValue || (prev == null && (currentValue == null || currentValue === ''));
      changed = !equal;
      if (changed) Object.assign(row as object, { [key]: currentValue });
    }
    if (!changed) return true;
    try {
      if (this.shouldBlockEdit(row, key)) {
        this.grid.undoMgr.undo();
        this.alertSvc.showError('Editing this field is blocked');
        Object.assign(row as object, { [key]: before[key] });
        return false;
      }
      const payload = this.utilsSvc.createPayload(row, key);
      const edited = await this.gridSvc
        .update(id, payload)
        .then(() => true)
        .catch(() => false);
      if (!edited) {
        this.grid.undoMgr.undo();
        Object.assign(row as object, { [key]: before[key] });
        this.alertSvc.showError('Update failed');
        return false;
      }
      this.grid.updateEditedRowInCaches(id, col.field, currentValue);
      this.grid.updateTableWindow(this.grid.startIndex(), this.grid.endIndex());
      this.alertSvc.showSuccess('Row updated');
      return true;
    } catch {
      Object.assign(row as object, { [key]: before[key] });
      this.alertSvc.showError('Update failed');
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
