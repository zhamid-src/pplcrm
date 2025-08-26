// Minimal helpers & mocks for fast unit tests (no Angular TestBed)

export function makeGridApiMock() {
  return {
    setGridOption: jest.fn(),
    getSelectedRows: jest.fn(),
    getSelectedNodes: jest.fn(),
    applyTransaction: jest.fn(),
    deselectAll: jest.fn(),
    exportDataAsCsv: jest.fn(),
    setSideBarVisible: jest.fn(),
    isSideBarVisible: jest.fn(),
    openToolPanel: jest.fn(),
    redrawRows: jest.fn(),
    refreshServerSide: jest.fn(),
    setGridOptionAny: jest.fn(), // convenience
  } as any;
}

export function makeConfirmDialogsMock(ok = true) {
  return {
    confirm: jest.fn().mockResolvedValue(ok),
  } as any;
}

export function makeAlertSvcMock() {
  return {
    showError: jest.fn(),
    showSuccess: jest.fn(),
  } as any;
}

export function makeGridSvcMock() {
  return {
    getAll: jest.fn(),
    deleteMany: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
    abort: jest.fn(),
  } as any;
}

export function makeServerSideParamsMock(overrides: Partial<any> = {}) {
  const req = {
    startRow: 0,
    endRow: 10,
    sortModel: [],
    filterModel: {},
  };
  const params = {
    request: req,
    success: jest.fn(),
    fail: jest.fn(),
    ...overrides,
  };
  return params as any;
}
