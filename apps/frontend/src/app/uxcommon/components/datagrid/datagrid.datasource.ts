import type { getAllOptionsType } from '@common';
import { AbstractAPIService } from '@services/api/abstract-api.service';
import type { SearchService } from '@services/api/search-service';
import { loadingGate } from '@uxcommon/loading-gate';

import type { GridApi, IServerSideDatasource, IServerSideGetRowsParams } from 'ag-grid-community';

export function createServerSideDatasource<T>(deps: {
  _loading: loadingGate;
  api: GridApi;
  gridSvc: AbstractAPIService<any, any>;
  searchSvc: SearchService;
  limitToTags: () => string[];
  pageSize: number; // required now so caller decides
  onResult?: (info: { rowCount: number }) => void;
  // whether we should query the archived dataset instead
  isArchiveMode?: () => boolean;
}): IServerSideDatasource {
  const pageSize = deps.pageSize;

  return {
    getRows: async (params: IServerSideGetRowsParams) => {
      const end = deps._loading.begin();
      try {
        const { startRow, sortModel, filterModel } = params.request;

        const options: getAllOptionsType = {
          searchStr: deps.searchSvc.getFilterText(),
          startRow,
          endRow: (startRow || 0) + pageSize,
          sortModel,
          filterModel,
          tags: deps.limitToTags(),
        } as getAllOptionsType;
        const useArchive = deps.isArchiveMode?.() === true;
        const data = useArchive ? await (deps.gridSvc as any).getAllArchived(options) : await deps.gridSvc.getAll(options);
        params.success({ rowData: data.rows as T[], rowCount: data.count });
        deps.onResult?.({ rowCount: data.count ?? 0 });
      } catch (err) {
        params.fail();
      } finally {
        end();
      }
    },
  };
}
