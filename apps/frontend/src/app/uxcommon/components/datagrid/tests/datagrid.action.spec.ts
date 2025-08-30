import { confirmDeleteAndRun, doExportCsv } from '../datagrid.actions';
import { DEFAULT_DATA_GRID_CONFIG } from '../datagrid.tokens';
import { makeAlertSvcMock, makeConfirmDialogsMock, makeGridApiMock, makeGridSvcMock } from './test-helpers';

describe('datagrid.actions', () => {
  test('confirmDeleteAndRun aborts on cancel', async () => {
    const dialogs = makeConfirmDialogsMock(false); // user cancels
    const alertSvc = makeAlertSvcMock();
    const api = makeGridApiMock();
    const gridSvc = makeGridSvcMock();

    await confirmDeleteAndRun({
      dialogs,
      alertSvc,
      api,
      getSelectedRows: () => [{ id: '1' }],
      gridSvc,
      rowModelType: 'clientSide',
      mergedGridOptions: { getRowId: () => '' },
      config: DEFAULT_DATA_GRID_CONFIG,
      _loading: { begin: () => jest.fn() } as any,
    });

    expect(gridSvc.deleteMany).not.toHaveBeenCalled();
  });

  test('confirmDeleteAndRun shows error when nothing selected', async () => {
    const dialogs = makeConfirmDialogsMock(true);
    const alertSvc = makeAlertSvcMock();
    const api = makeGridApiMock();
    const gridSvc = makeGridSvcMock();

    await confirmDeleteAndRun({
      dialogs,
      alertSvc,
      api,
      getSelectedRows: () => [],
      gridSvc,
      rowModelType: 'clientSide',
      mergedGridOptions: {},
      config: DEFAULT_DATA_GRID_CONFIG,
      _loading: { begin: () => jest.fn() } as any,
    });

    expect(alertSvc.showError).toHaveBeenCalledWith('Please select at least one row to delete.');
  });

  test('confirmDeleteAndRun deletes client-side with ids', async () => {
    const dialogs = makeConfirmDialogsMock(true);
    const alertSvc = makeAlertSvcMock();
    const api = makeGridApiMock();
    const gridSvc = makeGridSvcMock();
    gridSvc.deleteMany.mockResolvedValue(true);

    const rows = [{ id: '1' }, { id: '2' }];
    await confirmDeleteAndRun({
      dialogs,
      alertSvc,
      api,
      getSelectedRows: () => rows as any,
      gridSvc,
      rowModelType: 'clientSide',
      mergedGridOptions: { getRowId: () => '' },
      config: DEFAULT_DATA_GRID_CONFIG,
      _loading: { begin: () => jest.fn() } as any,
    });

    expect(gridSvc.deleteMany).toHaveBeenCalledWith(['1', '2']);
    expect(api.applyTransaction).toHaveBeenCalledWith({ remove: [{ id: '1' }, { id: '2' }] });
    expect(alertSvc.showSuccess).toHaveBeenCalled();
  });

  test('doExportCsv confirms then exports', async () => {
    const dialogs = makeConfirmDialogsMock(true);
    const api = makeGridApiMock();
    const alertSvc = makeAlertSvcMock();

    await doExportCsv({ dialogs, api, alertSvc, config: DEFAULT_DATA_GRID_CONFIG });
    expect(api.exportDataAsCsv).toHaveBeenCalled();
  });

  test('confirmDeleteAndRun filters out non-deletable rows and shows message', async () => {
    const dialogs = makeConfirmDialogsMock(true);
    const alertSvc = makeAlertSvcMock();
    const api = makeGridApiMock();
    const gridSvc = makeGridSvcMock();
    gridSvc.deleteMany.mockResolvedValue(true);

    const rows = [{ id: '1', deletable: false }, { id: '2' }];
    await confirmDeleteAndRun({
      dialogs,
      alertSvc,
      api,
      getSelectedRows: () => rows as any,
      gridSvc,
      rowModelType: 'clientSide',
      mergedGridOptions: { getRowId: () => '' },
      config: DEFAULT_DATA_GRID_CONFIG,
      _loading: { begin: () => jest.fn() } as any,
    });

    expect(alertSvc.showError).toHaveBeenCalledWith('Some rows cannot be deleted because these are system values.');
    expect(gridSvc.deleteMany).toHaveBeenCalledWith(['2']);
  });

  test('confirmDeleteAndRun aborts when all rows are non-deletable', async () => {
    const dialogs = makeConfirmDialogsMock(true);
    const alertSvc = makeAlertSvcMock();
    const api = makeGridApiMock();
    const gridSvc = makeGridSvcMock();
    gridSvc.deleteMany.mockResolvedValue(true);

    const rows = [{ id: '1', deletable: false }];
    await confirmDeleteAndRun({
      dialogs,
      alertSvc,
      api,
      getSelectedRows: () => rows as any,
      gridSvc,
      rowModelType: 'clientSide',
      mergedGridOptions: { getRowId: () => '' },
      config: DEFAULT_DATA_GRID_CONFIG,
      _loading: { begin: () => jest.fn() } as any,
    });

    expect(gridSvc.deleteMany).not.toHaveBeenCalled();
  });

  test('confirmDeleteAndRun shows deleteFailed when service returns false', async () => {
    const dialogs = makeConfirmDialogsMock(true);
    const alertSvc = makeAlertSvcMock();
    const api = makeGridApiMock();
    const gridSvc = makeGridSvcMock();
    gridSvc.deleteMany.mockResolvedValue(false);

    const rows = [{ id: '1' }];
    await confirmDeleteAndRun({
      dialogs,
      alertSvc,
      api,
      getSelectedRows: () => rows as any,
      gridSvc,
      rowModelType: 'clientSide',
      mergedGridOptions: { getRowId: () => '' },
      config: DEFAULT_DATA_GRID_CONFIG,
      _loading: { begin: () => jest.fn() } as any,
    });

    expect(alertSvc.showError).toHaveBeenCalledWith('Could not delete. Please try again later.');
  });

  test('confirmDeleteAndRun client-side without getRowId removes selected node data', async () => {
    const dialogs = makeConfirmDialogsMock(true);
    const alertSvc = makeAlertSvcMock();
    const api = makeGridApiMock();
    const gridSvc = makeGridSvcMock();
    gridSvc.deleteMany.mockResolvedValue(true);

    const rows = [{ id: '1' }];
    api.getSelectedNodes.mockReturnValue([
      { data: { id: '1', name: 'a' } },
      { data: { id: '2', name: 'b' } },
    ]);

    await confirmDeleteAndRun({
      dialogs,
      alertSvc,
      api,
      getSelectedRows: () => rows as any,
      gridSvc,
      rowModelType: 'clientSide',
      mergedGridOptions: {},
      config: DEFAULT_DATA_GRID_CONFIG,
      _loading: { begin: () => jest.fn() } as any,
    });

    expect(api.applyTransaction).toHaveBeenCalledWith({ remove: [{ id: '1', name: 'a' }] });
  });

  test('doExportCsv cancels gracefully', async () => {
    const dialogs = makeConfirmDialogsMock(false);
    const api = makeGridApiMock();
    const alertSvc = makeAlertSvcMock();

    await doExportCsv({ dialogs, api, alertSvc, config: DEFAULT_DATA_GRID_CONFIG });
    expect(api.exportDataAsCsv).not.toHaveBeenCalled();
  });

  test('doExportCsv shows error when export throws', async () => {
    const dialogs = makeConfirmDialogsMock(true);
    const api = makeGridApiMock();
    const alertSvc = makeAlertSvcMock();
    api.exportDataAsCsv.mockImplementation(() => {
      throw new Error('boom');
    });

    await doExportCsv({ dialogs, api, alertSvc, config: DEFAULT_DATA_GRID_CONFIG });
    expect(alertSvc.showError).toHaveBeenCalledWith('Export failed. Please try again.');
  });
});
