import { createServerSideDatasource } from '../datagrid.datasource';
import { makeGridApiMock, makeGridSvcMock, makeServerSideParamsMock } from './test-helpers';

describe('datagrid.datasource', () => {
  test('getRows calls gridSvc.getAll and success', async () => {
    const api = makeGridApiMock();
    const gridSvc = makeGridSvcMock();
    const searchSvc = { getFilterText: jest.fn().mockReturnValue('abc') } as any;
    const limitToTags = () => ['x', 'y'];
    const ds = createServerSideDatasource({
      api,
      gridSvc,
      searchSvc,
      limitToTags,
      pageSize: 10,
    });

    gridSvc.getAll.mockResolvedValue({ rows: [{ id: '1' }], count: 25 });
    const params = makeServerSideParamsMock();

    await ds.getRows(params);

    expect(api.setGridOption).toHaveBeenCalledWith('loading', true);
    expect(gridSvc.getAll).toHaveBeenCalledWith(
      expect.objectContaining({ searchStr: 'abc', endRow: 10, tags: ['x', 'y'] }),
    );
    expect(params.success).toHaveBeenCalledWith({ rowData: [{ id: '1' }], rowCount: 25 });
    expect(api.setGridOption).toHaveBeenCalledWith('loading', false);
  });

  test('getRows fail path', async () => {
    const api = makeGridApiMock();
    const gridSvc = makeGridSvcMock();
    const searchSvc = { getFilterText: jest.fn().mockReturnValue('') } as any;
    const ds = createServerSideDatasource({
      api,
      gridSvc,
      searchSvc,
      limitToTags: () => [],
      pageSize: 10,
    });

    gridSvc.getAll.mockRejectedValue(new Error('boom'));
    const params = makeServerSideParamsMock();

    await ds.getRows(params);

    expect(params.fail).toHaveBeenCalled();
    expect(api.setGridOption).toHaveBeenLastCalledWith('loading', false);
  });
});
