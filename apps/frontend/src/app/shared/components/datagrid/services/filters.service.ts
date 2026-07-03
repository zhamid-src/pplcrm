import { Injectable } from '@angular/core';
import type { ColumnDef as ColDef } from '../grid-defaults';

export type Op =
  | 'contains'
  | 'equals'
  | 'in'
  | 'isEmpty'
  | 'isNotEmpty'
  | 'notContains'
  | 'notEquals'
  | 'startsWith'
  | 'endsWith';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectEditorOptions {
  choices: SelectOption[];
  multiple: boolean;
  size?: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

@Injectable({ providedIn: 'root' })
export class DataGridFiltersService {
  buildFilterModel(raw: Record<string, unknown>): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(raw)) {
      if (v === undefined || v === null) continue;
      if (isRecord(v) && 'value' in v) {
        const op = v['op'] ?? 'contains';
        const sv = String(v['value'] ?? '').trim();
        if (op === 'isEmpty' || op === 'isNotEmpty') {
          out[k] = { type: 'text', op, value: '' };
        } else {
          if (!sv) continue;
          out[k] = { type: 'text', op, value: sv };
        }
      } else {
        const sv = String(v).trim();
        if (!sv) continue;
        out[k] = { type: 'text', op: 'contains', value: sv };
      }
    }
    return out;
  }

  getSelectEditorOptions(col: ColDef): SelectEditorOptions | null {
    const cfg = this.resolveEditorConfig(col);
    if (!cfg) return null;
    const rawValues = Array.isArray(cfg['values']) ? (cfg['values'] as unknown[]) : [];
    const labels = Array.isArray(cfg['labels']) ? (cfg['labels'] as unknown[]) : null;
    const choices: SelectOption[] = [];
    for (let i = 0; i < rawValues.length; i++) {
      const entry = rawValues[i];
      const fallbackLabel = labels && labels.length > i ? labels[i] : undefined;
      if (entry && typeof entry === 'object') {
        const obj = entry as Record<string, unknown>;
        const value = 'value' in obj ? obj['value'] : entry;
        const labelCandidate = 'label' in obj ? obj['label'] : 'name' in obj ? obj['name'] : fallbackLabel;
        const valueStr = value != null ? String(value) : '';
        const labelStr = labelCandidate != null ? String(labelCandidate) : valueStr;
        choices.push({ value: valueStr, label: labelStr });
      } else {
        const valueStr = entry != null ? String(entry) : '';
        const labelStr = fallbackLabel != null ? String(fallbackLabel) : valueStr;
        choices.push({ value: valueStr, label: labelStr });
      }
    }
    const multiple = !!cfg['multiple'];
    if (!choices.length && !multiple) return null;
    const sizeRaw = cfg['size'] ?? cfg['listSize'] ?? cfg['rows'] ?? cfg['lines'];
    const parsed = Number(sizeRaw);
    const size = Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : multiple ? 5 : undefined;
    return { choices, multiple, size };
  }

  getFilterOptionsForCol(col: ColDef): string[] | null {
    const options = this.getSelectEditorOptions(col);
    if (!options || !options.choices.length) return null;
    return options.choices.map((c) => c.label);
  }

  getFilterValue(filterValues: Record<string, unknown>, field: string): string {
    const fv = filterValues[field];
    if (isRecord(fv) && !Array.isArray(fv) && 'value' in fv) return String(fv['value'] ?? '');
    return fv ? String(fv) : '';
  }

  getFilterArray(filterValues: Record<string, unknown>, field: string): string[] {
    const fv = filterValues[field];
    if (isRecord(fv) && !Array.isArray(fv) && Array.isArray(fv['value'])) return fv['value'] as string[];
    if (Array.isArray(fv)) return fv as string[];
    const single = this.getFilterValue(filterValues, field);
    return single ? [single] : [];
  }

  inlineFilterLabel(filterValues: Record<string, unknown>, field: string): string {
    const arr = this.getFilterArray(filterValues, field);
    if (!arr.length) return 'All';
    if (arr.length === 1) return arr[0]!;
    return `${arr.length} selected`;
  }

  preparePanelFilters(current: Record<string, unknown>): Record<string, { op: string; value: unknown }> {
    const panel: Record<string, { op: string; value: unknown }> = {};
    for (const [k, v] of Object.entries(current)) {
      if (isRecord(v) && 'op' in v && 'value' in v) panel[k] = { op: String(v['op']), value: v['value'] };
      else panel[k] = { op: 'contains', value: v };
    }
    return panel;
  }

  private resolveEditorConfig(col: ColDef): Record<string, unknown> | null {
    const cep = col?.cellEditorParams;
    if (!cep) return null;
    try {
      const resolved = typeof cep === 'function' ? (cep as () => unknown)() : cep;
      return isRecord(resolved) ? resolved : null;
    } catch {
      return null;
    }
  }
}
