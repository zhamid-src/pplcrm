// Lightweight column definition used by DataGrid
export interface ColumnDef {
  field?: string;
  headerName?: string;
  editable?: boolean;
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
  cellEditorParams?: any;
}

export const SELECTION_COLUMN: ColumnDef = {};
