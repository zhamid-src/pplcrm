import { confirmDeleteAndRun, doExportCsv } from '../datagrid.actions';
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
    });

    expect(gridSvc.deleteMany).toHaveBeenCalledWith(['1', '2']);
    expect(api.applyTransaction).toHaveBeenCalledWith({ remove: [{ id: '1' }, { id: '2' }] });
    expect(alertSvc.showSuccess).toHaveBeenCalled();
  });

  test('doExportCsv confirms then exports', async () => {
    const dialogs = makeConfirmDialogsMock(true);
    const api = makeGridApiMock();
    const alertSvc = makeAlertSvcMock();

    await doExportCsv({ dialogs, api, alertSvc });
    expect(api.exportDataAsCsv).toHaveBeenCalled();
  });
});
