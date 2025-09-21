import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class FetchController {
  async loadPage(opts: {
    index: number;
    append?: boolean;
    pageSize: number;
    archiveMode: boolean;
    searchText: string;
    limitToTags: string[];
    filterModel: Record<string, any>;
    sortState: Array<{ id: string; desc?: boolean }>;
    sortCol: string | null;
    sortDir: 'asc' | 'desc' | null;

    // dependencies
    gridSvc: {
      getAll(o: any): Promise<{ rows: any[]; count: number }>;
      getAllArchived(o: any): Promise<{ rows: any[]; count: number }>;
    };
    dataSvc: { buildGetAllOptions(a: any): any };

    // state hooks
    getRows: () => any[];
    setRows: (rows: any[]) => void;
    setVirtualCount?: (count: number) => void;
    updateTableData: (rows: any[]) => void;
    setTotalCountAll: (n: number) => void;
    setPageIndex: (i: number) => void;

    // error/loading UX
    begin: () => () => void;
    showError: (msg: string) => void;
    loadFailedMsg: string;
  }): Promise<void> {
    const end = opts.begin();
    try {
      const startRow = opts.index * opts.pageSize;
      const endRow = startRow + opts.pageSize;
      const options = opts.dataSvc.buildGetAllOptions({
        searchStr: opts.searchText,
        startRow,
        endRow,
        tags: opts.limitToTags,
        filterModel: opts.filterModel,
        sortState: opts.sortState,
        sortCol: opts.sortCol,
        sortDir: opts.sortDir,
        includeArchived: opts.archiveMode,
      });
      const data = opts.archiveMode ? await opts.gridSvc.getAllArchived(options) : await opts.gridSvc.getAll(options);
      const incoming = data.rows ?? [];
      if (opts.append && opts.getRows().length > 0) {
        const next = [...opts.getRows(), ...incoming];
        opts.setRows(next);
        opts.updateTableData(next);
      } else {
        opts.setRows(incoming);
        opts.updateTableData(incoming);
      }
      if (opts.setVirtualCount) opts.setVirtualCount(opts.getRows().length);
      opts.setTotalCountAll(data.count ?? opts.getRows().length);
      opts.setPageIndex(opts.index);
    } catch {
      opts.showError(opts.loadFailedMsg);
    } finally {
      end();
    }
  }

  async selectAllMatching(opts: {
    archiveMode: boolean;
    searchText: string;
    limitToTags: string[];
    gridSvc: {
      getAll(o: any): Promise<{ rows: any[]; count: number }>;
      getAllArchived(o: any): Promise<{ rows: any[]; count: number }>;
    };
  }): Promise<{ ids: string[]; count: number }> {
    const options: any = { searchStr: opts.searchText, tags: opts.limitToTags };
    const { rows, count } = opts.archiveMode ? await opts.gridSvc.getAllArchived(options) : await opts.gridSvc.getAll(options);
    const ids = (rows ?? []).map((r: any) => String(r.id)).filter(Boolean);
    return { ids, count: count ?? ids.length };
  }
}
