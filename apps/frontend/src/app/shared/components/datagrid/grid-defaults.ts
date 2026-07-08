import type { GridRow } from './types';

/** Params passed to colDef callbacks (cellRenderer, valueFormatter, valueGetter, valueSetter, ...). */
export interface CellParams {
  data?: GridRow;
  value?: unknown;
  newValue?: unknown;
  colDef?: ColumnDef;
  /** Native DOM event, present on click callbacks so a renderer's inner links can be resolved. */
  event?: Event;
}

// Lightweight column definition used by DataGrid
export interface ColumnDef {
  cellClass?: string | ((p: CellParams) => string | undefined);
  cellDataType?: string;
  cellEditorParams?: unknown;
  cellRenderer?: (p: CellParams) => CellRendererResult;
  cellRendererParams?: unknown;
  comparator?: (a: unknown, b: unknown) => number;
  /** Clicking any cell in this column opens the record (the "name is the door" cell). */
  doorColumn?: boolean;
  /** Optional muted second line under a door cell (e.g. "3 people" under a household address). */
  doorSubtitle?: (p: CellParams) => string | null;
  editable?: boolean;
  equals?: (a: unknown, b: unknown) => boolean;
  field?: string;
  headerName?: string;
  hide?: boolean;
  /** Column cannot be hidden by the user (identity columns like the Name door). */
  noHide?: boolean;
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
