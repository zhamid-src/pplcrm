export function updateTableWindow(
  table: any,
  rows: any[],
  start: number,
  end: number,
  rowSelection: Record<string, boolean>,
  sortCol: string | null,
  sortDir: 'asc' | 'desc' | null,
) {
  const data = rows.slice(start, end);
  if (!table) return;
  table.setOptions((prev: any) => ({
    ...prev,
    data,
    state: {
      ...prev.state,
      rowSelection,
      sorting: sortCol && sortDir ? [{ id: sortCol, desc: sortDir === 'desc' }] : [],
    },
  }));
}

export function setTableData(
  table: any,
  rows: any[],
  rowSelection: Record<string, boolean>,
  sortCol: string | null,
  sortDir: 'asc' | 'desc' | null,
) {
  if (!table) return;
  table.setOptions((prev: any) => ({
    ...prev,
    data: rows,
    state: {
      ...prev.state,
      rowSelection,
      sorting: sortCol && sortDir ? [{ id: sortCol, desc: sortDir === 'desc' }] : [],
    },
  }));
}

