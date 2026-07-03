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
  table?: any;
}
