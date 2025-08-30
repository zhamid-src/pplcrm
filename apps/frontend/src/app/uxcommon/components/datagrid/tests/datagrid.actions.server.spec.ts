import { confirmDeleteAndRun } from '../datagrid.actions';
import { DEFAULT_DATA_GRID_CONFIG } from '../datagrid.tokens';
import { makeAlertSvcMock, makeConfirmDialogsMock, makeGridApiMock, makeGridSvcMock } from './test-helpers';

describe('datagrid.actions server-side', () => {
  function baseCtx(overrides: Partial<any> = {}) {
    const dialogs = makeConfirmDialogsMock(true);
    const alertSvc = makeAlertSvcMock();
    const api = makeGridApiMock();
    const gridSvc = makeGridSvcMock();
    gridSvc.deleteMany.mockResolvedValue(true);

    const ctx = {
      dialogs,
      alertSvc,
      api: api as any,
      getSelectedRows: () => [{ id: '1' }, { id: '2' }],
      gridSvc,
      rowModelType: 'serverSide' as const,
      mergedGridOptions: { serverSideStoreType: 'full', getRowId: () => '' },
      config: DEFAULT_DATA_GRID_CONFIG,
      _loading: { begin: () => jest.fn() } as any,
      ...overrides,
    };
    return { ctx, api, alertSvc, dialogs, gridSvc };
  }

  test('applies server-side transaction with buckets when full store and getRowId', async () => {
    const { ctx, api } = baseCtx();

    // selected nodes must include data and routes that match selected rows
    api.getSelectedNodes.mockReturnValue([
      { data: { id: '1' }, route: ['A'] },
      { data: { id: '2' }, route: ['B'] },
    ]);
    (api as any).applyServerSideTransaction = jest.fn();

    await confirmDeleteAndRun(ctx);

    // Called twice: once per bucket
    expect((api as any).applyServerSideTransaction).toHaveBeenCalledTimes(2);
    expect((api as any).applyServerSideTransaction).toHaveBeenCalledWith({
      route: ['A'],
      remove: [{ id: '1' }],
    });
    expect((api as any).applyServerSideTransaction).toHaveBeenCalledWith({
      route: ['B'],
      remove: [{ id: '2' }],
    });
  });

  test('applies one transaction without buckets when none found', async () => {
    const { ctx, api } = baseCtx();
    api.getSelectedNodes.mockReturnValue([]);
    (api as any).applyServerSideTransaction = jest.fn();

    await confirmDeleteAndRun(ctx);

    expect((api as any).applyServerSideTransaction).toHaveBeenCalledTimes(1);
    expect((api as any).applyServerSideTransaction).toHaveBeenCalledWith({
      remove: [{ id: '1' }, { id: '2' }],
    });
  });

  test('refreshes server side when cannot transaction', async () => {
    const { ctx, api } = baseCtx({ mergedGridOptions: { serverSideStoreType: 'partial' } });
    (api as any).refreshServerSide = jest.fn();

    await confirmDeleteAndRun(ctx);

    expect((api as any).refreshServerSide).toHaveBeenCalledWith({ purge: true });
  });
});

