export function isPageFullySelected(
  allSelected: boolean,
  rowsOnCurrentPage: number,
  selectedOnPage: number,
): boolean {
  if (allSelected) return false;
  if (rowsOnCurrentPage === 0) return false;
  return selectedOnPage > 0 && selectedOnPage === rowsOnCurrentPage;
}

export function togglePageSelectionSet(
  current: Set<string>,
  rows: Array<{ id?: string } | any>,
  checked: boolean,
): Set<string> {
  const next = new Set<string>(current);
  if (checked) {
    for (const r of rows) {
      const id = String((r as any)?.id ?? '');
      if (id) next.add(id);
    }
  } else {
    for (const r of rows) {
      const id = String((r as any)?.id ?? '');
      if (id) next.delete(id);
    }
  }
  return next;
}

export function updateAllSelectedIdSet(set: Set<string>, id: string, checked: boolean): void {
  if (!checked) set.delete(id);
  else set.add(id);
}

