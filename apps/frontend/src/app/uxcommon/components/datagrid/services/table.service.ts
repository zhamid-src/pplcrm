import { Injectable } from '@angular/core';
import { createTable, getCoreRowModel, type Updater, type SortingState, type ColumnDef as TSColumnDef } from '@tanstack/table-core';
import type { ColumnDef as ColDef } from '../grid-defaults';

@Injectable({ providedIn: 'root' })
export class DataGridTableService {
  updateTableWindow(
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

  setTableData(
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

  createGridTable(params: {
    rows: any[];
    columns: TSColumnDef<any, any>[];
    getRowId: (row: any) => string;
    state: any;
    onStateChange: () => void;
    onSortingChange: (updater: Updater<SortingState>) => void;
    onRowSelectionChange: (updater: Updater<any>) => void;
    onColumnSizingChange: (updater: Updater<Record<string, number>>) => void;
  }): any {
    return createTable({
      data: params.rows,
      columns: params.columns,
      getCoreRowModel: getCoreRowModel(),
      getRowId: params.getRowId,
      // not in the formal type, supported by our usage
      enableColumnResizing: true as unknown as boolean,
      state: params.state,
      initialState: {
        columnPinning: { left: [], right: [] },
        columnSizing: {},
      },
      onStateChange: params.onStateChange,
      renderFallbackValue: null as unknown,
      onSortingChange: params.onSortingChange,
      onRowSelectionChange: params.onRowSelectionChange,
      columnResizeMode: 'onChange',
      onColumnSizingChange: params.onColumnSizingChange,
    });
  }

  buildTsColumns(colDefs: ColDef[]): TSColumnDef<any, any>[] {
    return (colDefs
      .filter((c) => !!c.field)
      .map((c) => ({
        id: c.field as string,
        header: c.headerName || (c.field as string),
        accessorFn: (row: any) => row?.[c.field as string],
        enableSorting: true,
        enableResizing: true,
      })) as unknown) as TSColumnDef<any, any>[];
  }
}
