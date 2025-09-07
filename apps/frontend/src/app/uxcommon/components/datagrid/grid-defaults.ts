import { DEFAULT_DATA_GRID_CONFIG } from './datagrid.tokens';

// Lightweight, AG-free column definition used by DataGrid
export interface ColumnDef {
  field?: string;
  headerName?: string;
  editable?: boolean;
  colId?: string;
  filter?: any;
  cellDataType?: string;
  cellRenderer?: (p: { data: any; value: any; colDef: ColumnDef }) => string;
  cellRendererParams?: any;
  valueFormatter?: (p: { data: any; value: any; colDef: ColumnDef }) => any;
  comparator?: (a: any, b: any) => number;
  equals?: (a: any, b: any) => boolean;
  onCellDoubleClicked?: (event: any) => void;
  // Compatibility props (ignored by current table but kept for typing)
  valueGetter?: (p: any) => any;
  valueSetter?: (p: any) => boolean;
  cellClass?: string | ((p: any) => string | undefined);
  cellEditor?: any;
  cellEditorParams?: any;
}

export const SELECTION_COLUMN: ColumnDef = {};

export const defaultGridOptions = {
  pageSize: DEFAULT_DATA_GRID_CONFIG.pageSize,
};
