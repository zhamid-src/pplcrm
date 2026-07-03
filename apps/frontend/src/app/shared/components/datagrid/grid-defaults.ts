import type { GridRow } from './types';

/** Params passed to colDef callbacks (cellRenderer, valueFormatter, valueGetter, valueSetter, ...). */
export interface CellParams {
  data?: GridRow;
  value?: unknown;
  newValue?: unknown;
  colDef?: ColumnDef;
}

// Lightweight column definition used by DataGrid
export interface ColumnDef {
  cellClass?: string | ((p: CellParams) => string | undefined);
  cellDataType?: string;
  cellEditorParams?: unknown;
  cellRenderer?: (p: CellParams) => CellRendererResult;
  cellRendererParams?: unknown;
  comparator?: (a: unknown, b: unknown) => number;
  editable?: boolean;
  equals?: (a: unknown, b: unknown) => boolean;
  field?: string;
  headerName?: string;
  hide?: boolean;
  onCellClicked?: (event: CellParams) => void;
  onCellDoubleClicked?: (event: CellParams) => void;
  isCellInteractive?: (row: GridRow) => boolean;
  tagColumn?: boolean;
  valueFormatter?: (p: CellParams) => unknown;

  // Compatibility props (ignored by current table but kept for typing)
  valueGetter?: (p: CellParams) => unknown;
  valueSetter?: (p: CellParams) => boolean;
  minWidth?: number;
}

type CellRendererResult = string | HTMLElement;

export const SELECTION_COLUMN: ColumnDef = {};
