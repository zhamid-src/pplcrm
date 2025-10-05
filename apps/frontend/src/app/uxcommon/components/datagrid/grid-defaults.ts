// Lightweight column definition used by DataGrid
export interface ColumnDef {
  cellClass?: string | ((p: any) => string | undefined);
  cellDataType?: string;
  cellEditorParams?: any;
  cellRenderer?: (p: { data: any; value: any; colDef: ColumnDef }) => CellRendererResult;
  cellRendererParams?: any;
  comparator?: (a: any, b: any) => number;
  editable?: boolean;
  equals?: (a: any, b: any) => boolean;
  field?: string;
  headerName?: string;
  onCellDoubleClicked?: (event: any) => void;
  tagColumn?: boolean;
  valueFormatter?: (p: { data: any; value: any; colDef: ColumnDef }) => any;

  // Compatibility props (ignored by current table but kept for typing)
  valueGetter?: (p: any) => any;
  valueSetter?: (p: any) => boolean;
}

type CellRendererResult = string | HTMLElement;

export const SELECTION_COLUMN: ColumnDef = {};
