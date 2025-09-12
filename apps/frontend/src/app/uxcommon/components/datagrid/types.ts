export type SortDir = 'asc' | 'desc' | 'none';

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

