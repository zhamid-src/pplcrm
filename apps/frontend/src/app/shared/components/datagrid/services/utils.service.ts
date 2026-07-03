import { Injectable } from '@angular/core';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

@Injectable({ providedIn: 'root' })
export class DataGridUtilsService {
  bucketByRoute(nodes: unknown[]): Map<string, unknown[]> {
    const map = new Map<string, unknown[]>();
    for (const n of nodes) {
      const routeArr = isRecord(n) && Array.isArray(n['route']) ? n['route'] : [];
      const key = JSON.stringify(routeArr);
      const list = map.get(key) ?? [];
      if (isRecord(n) && n['data']) list.push(n['data']);
      map.set(key, list);
    }
    return map;
  }

  createPayload<T>(row: Partial<T>, key: keyof T): Partial<T> {
    return row[key] !== undefined ? ({ [key]: row[key] } as Partial<T>) : {};
  }

  tagsToString(tags: string[]): string {
    if (!tags || !Array.isArray(tags)) return '';
    return tags
      .filter((t) => typeof t === 'string' && t.trim().length > 0)
      .map((t) => {
        const trimmed = t.trim();
        return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
      })
      .join(', ');
  }

  tagArrayEquals(tagsA: string[], tagsB: string[]): number {
    return (tagsA ?? []).toString().localeCompare((tagsB ?? []).toString());
  }

  normalizeTagSelection(value: unknown): string[] {
    const input = Array.isArray(value) ? value : value == null ? [] : [value];
    const seen = new Set<string>();
    const result: string[] = [];
    for (const entry of input) {
      if (entry == null) continue;
      const tag = typeof entry === 'string' ? entry.trim() : String(entry).trim();
      if (!tag) continue;
      if (seen.has(tag)) continue;
      seen.add(tag);
      result.push(tag);
    }
    return result;
  }
}
