export type SortDir = 'asc' | 'desc' | 'none';

/** Row shape served by the grid APIs: a dynamic record keyed by column field. */
export type GridRow = Record<string, unknown>;

export interface HeaderRef {
  column: {
    id: string;
    getIsSorted?: () => 'asc' | 'desc' | false;
    toggleSorting?: (desc?: boolean, multi?: boolean) => void;
    clearSorting?: () => void;
    pin?: (side: 'left' | 'right' | false) => void;
    getIsPinned?: () => 'left' | 'right' | false;
    getSize?: () => number;
    setSize?: (px: number) => void;
  };
  table?: unknown;
}

/** Undo/redo snapshot of grid state, captured before/after an edit commits. */
export interface GridSnapshot {
  rows: GridRow[];
  selectedIdSet: Set<string>;
  filterValues: Record<string, unknown>;
  sorting: unknown[];
  pageIndex: number;
  pageSize: number;
  editMeta?: {
    id: string;
    field: string;
    prevValue: unknown;
    newValue: unknown;
  };
}

/** Minimal shape of DataGrid that GridStoreService/UndoManager depend on (avoids importing DataGrid directly). */
export interface GridHost {
  undoMgr: { pushUndo(snapshot: GridSnapshot): void };
  store: {
    rows: { (): GridRow[]; set: (rows: GridRow[]) => void };
    selectedIdSet: { (): Set<string>; set: (ids: Set<string>) => void };
    filterValues: { (): Record<string, unknown>; set: (v: Record<string, unknown>) => void };
    sorting: { (): unknown[]; set: (v: unknown[]) => void };
    pageIndex: { (): number; set: (v: number) => void };
    pageSize: { (): number; set: (v: number) => void };
  };
  gridSvc: { update(id: string, data: unknown): Promise<unknown> };
  alertSvc: { showError(msg: string): void };
  updateTableWindow(start: number, end: number): void;
  startIndex(): number;
  endIndex(): number;
  triggerCellFlash(rowId: string, field: string): void;
}
