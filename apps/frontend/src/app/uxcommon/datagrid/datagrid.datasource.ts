import type { getAllOptionsType } from '@common';

import type { GridApi, IServerSideDatasource, IServerSideGetRowsParams } from 'ag-grid-community';

import type { AbstractAPIService } from '../../abstract-api.service';
import type { SearchService } from '@services/api/search-service';

export function createServerSideDatasource<T>(deps: {
  api: GridApi;
  gridSvc: AbstractAPIService<any, any>;
  searchSvc: SearchService;
  limitToTags: () => string[];
  pageSize: number; // required now so caller decides
}): IServerSideDatasource {
  const pageSize = deps.pageSize;

  return {
    getRows: async (params: IServerSideGetRowsParams) => {
      try {
        deps.api.setGridOption('loading', true);
        const { startRow, sortModel, filterModel } = params.request;

        const options: getAllOptionsType = {
          searchStr: deps.searchSvc.getFilterText(),
          startRow,
          endRow: (startRow || 0) + pageSize,
          sortModel,
          filterModel,
          tags: deps.limitToTags(),
        } as getAllOptionsType;

        const data = await deps.gridSvc.getAll(options);
        params.success({ rowData: data.rows as T[], rowCount: data.count });
      } catch (err) {
        console.log('error', err);
        params.fail();
      } finally {
        deps.api.setGridOption('loading', false);
      }
    },
  };
}
