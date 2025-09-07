
/** SSRM helper: bucket selected nodes by their route (for grouped stores) */
export function bucketByRoute(nodes: any[]): Map<string, any[]> {
  const map = new Map<string, any[]>();
  for (const n of nodes) {
    const routeArr = (n as any).route ?? [];
    const key = JSON.stringify(routeArr);
    const list = map.get(key) ?? [];
    if (n.data) list.push(n.data);
    map.set(key, list);
  }
  return map;
}

/** Helper: returns single-field payload from row */
export function createPayload<T>(row: Partial<T>, key: keyof T): Partial<T> {
  return row[key] !== undefined ? ({ [key]: row[key] } as Partial<T>) : {};
}

/** Utility: sets ID for each row (keep it stringy for stability) */
// getRowId removed (AG Grid)

/** Turns tag array into string */
export function tagsToString(tags: string[]): string {
  return !tags || !tags[0] ? '' : tags.toString();
}

/** Compares two tag arrays */
export function tagArrayEquals(tagsA: string[], tagsB: string[]): number {
  return (tagsA ?? []).toString().localeCompare((tagsB ?? []).toString());
}
