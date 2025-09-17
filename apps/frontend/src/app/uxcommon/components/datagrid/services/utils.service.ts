import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class DataGridUtilsService {
  bucketByRoute(nodes: any[]): Map<string, any[]> {
    const map = new Map<string, any[]>();
    for (const n of nodes) {
      const routeArr = (n as { route?: unknown[] }).route ?? [];
      const key = JSON.stringify(routeArr);
      const list = map.get(key) ?? [];
      if (n.data) list.push(n.data);
      map.set(key, list);
    }
    return map;
  }

  createPayload<T>(row: Partial<T>, key: keyof T): Partial<T> {
    return row[key] !== undefined ? ({ [key]: row[key] } as Partial<T>) : {};
  }

  tagsToString(tags: string[]): string {
    return !tags || !tags[0] ? '' : tags.toString();
  }

  tagArrayEquals(tagsA: string[], tagsB: string[]): number {
    return (tagsA ?? []).toString().localeCompare((tagsB ?? []).toString());
  }
}
