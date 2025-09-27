import { Injectable } from '@angular/core';
import type { ColumnDef as ColDef } from '../grid-defaults';

export interface EditorChoice {
  value: string;
  label: string;
}

export type Op = 'contains' | 'equals' | 'in';

@Injectable({ providedIn: 'root' })
export class DataGridFiltersService {
  buildFilterModel(raw: Record<string, any>): Record<string, any> {
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(raw)) {
      if (v === undefined || v === null) continue;
      if (typeof v === 'object' && v && 'value' in v) {
        const vv = v as { op?: Op; value?: unknown };
        const op = vv.op ?? 'contains';
        const sv = String(vv.value ?? '').trim();
        if (!sv) continue;
        out[k] = { type: 'text', op, value: sv };
      } else {
        const sv = String(v).trim();
        if (!sv) continue;
        out[k] = { type: 'text', op: 'contains', value: sv };
      }
    }
    return out;
  }

  getEditorChoices(col: ColDef): EditorChoice[] {
    const cfg = this.resolveEditorConfig(col);
    if (!cfg || !Array.isArray(cfg.values)) return [];
    const raw = cfg.values as any[];
    const labels = Array.isArray(cfg.labels) ? cfg.labels : null;
    const choices: EditorChoice[] = [];
    for (let i = 0; i < raw.length; i++) {
      const entry = raw[i];
      const fallbackLabel = labels && labels.length > i ? labels[i] : undefined;
      if (entry && typeof entry === 'object') {
        const value = 'value' in entry ? entry.value : entry;
        const labelCandidate =
          'label' in entry
            ? (entry as { label: unknown }).label
            : 'name' in entry
              ? (entry as { name: unknown }).name
              : fallbackLabel;
        const valueStr = value != null ? String(value) : '';
        const labelStr = labelCandidate != null ? String(labelCandidate) : valueStr;
        choices.push({ value: valueStr, label: labelStr });
      } else {
        const valueStr = entry != null ? String(entry) : '';
        const labelStr = fallbackLabel != null ? String(fallbackLabel) : valueStr;
        choices.push({ value: valueStr, label: labelStr });
      }
    }
    return choices;
  }

  getFilterOptionsForCol(col: ColDef): string[] | null {
    const choices = this.getEditorChoices(col);
    if (!choices.length) return null;
    return choices.map((c) => c.label);
  }

  getFilterValue(filterValues: Record<string, any>, field: string): string {
    const fv: any = filterValues[field];
    if (fv && typeof fv === 'object' && 'value' in fv) return String(fv.value ?? '');
    return fv ? String(fv) : '';
  }

  getFilterArray(filterValues: Record<string, any>, field: string): string[] {
    const fv: any = filterValues[field];
    if (fv && typeof fv === 'object' && Array.isArray(fv.value)) return fv.value as string[];
    const single = this.getFilterValue(filterValues, field);
    return single ? [single] : [];
  }

  inlineFilterLabel(filterValues: Record<string, any>, field: string): string {
    const arr = this.getFilterArray(filterValues, field);
    if (!arr.length) return 'All';
    if (arr.length === 1) return arr[0];
    return `${arr.length} selected`;
  }

  preparePanelFilters(current: Record<string, any>): Record<string, { op: 'contains' | 'equals'; value: any }> {
    const panel: Record<string, { op: 'contains' | 'equals'; value: any }> = {};
    for (const [k, v] of Object.entries(current)) {
      const entry = v as { op?: 'contains' | 'equals'; value?: any };
      if (entry && typeof entry === 'object' && 'op' in entry && 'value' in entry)
        panel[k] = entry as { op: 'contains' | 'equals'; value: any };
      else panel[k] = { op: 'contains', value: v };
    }
    return panel;
  }

  private resolveEditorConfig(col: ColDef): any {
    const cep = col?.cellEditorParams;
    if (!cep) return null;
    try {
      return typeof cep === 'function' ? cep() : cep;
    } catch {
      return null;
    }
  }
}
