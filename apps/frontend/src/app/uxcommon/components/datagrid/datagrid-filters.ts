import type { ColumnDef as ColDef } from './grid-defaults';

export type Op = 'contains' | 'equals' | 'in';

export function buildFilterModel(raw: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (v === undefined || v === null) continue;
    if (typeof v === 'object' && v && 'value' in (v as any)) {
      const op = ((v as any).op as Op) ?? 'contains';
      const sv = String((v as any).value ?? '').trim();
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

export function getFilterOptionsForCol(col: ColDef): string[] | null {
  const cep: any = (col as any)?.cellEditorParams;
  let cfg: any = null;
  if (!cep) return null;
  try {
    cfg = typeof cep === 'function' ? cep() : cep;
  } catch {
    cfg = null;
  }
  const vals = cfg?.values;
  return Array.isArray(vals) && vals.length ? (vals as string[]) : null;
}

export function getFilterValue(filterValues: Record<string, any>, field: string): string {
  const fv: any = filterValues[field];
  if (fv && typeof fv === 'object' && 'value' in fv) return String(fv.value ?? '');
  return fv ? String(fv) : '';
}

export function getFilterArray(filterValues: Record<string, any>, field: string): string[] {
  const fv: any = filterValues[field];
  if (fv && typeof fv === 'object' && Array.isArray(fv.value)) return fv.value as string[];
  const single = getFilterValue(filterValues, field);
  return single ? [single] : [];
}

export function inlineFilterLabel(filterValues: Record<string, any>, field: string): string {
  const arr = getFilterArray(filterValues, field);
  if (!arr.length) return 'All';
  if (arr.length === 1) return arr[0];
  return `${arr.length} selected`;
}

export function preparePanelFilters(current: Record<string, any>): Record<string, { op: 'contains' | 'equals'; value: any }> {
  const panel: Record<string, { op: 'contains' | 'equals'; value: any }> = {};
  for (const [k, v] of Object.entries(current)) {
    const entry = v as any;
    if (entry && typeof entry === 'object' && 'op' in entry && 'value' in entry) panel[k] = entry;
    else panel[k] = { op: 'contains', value: v };
  }
  return panel;
}

