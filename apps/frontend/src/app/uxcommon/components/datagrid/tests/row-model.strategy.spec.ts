import { ClientSideStrategy, ServerSideStrategy } from '../row-model.strategy';
import { defaultGridOptions } from '../grid-defaults';

function makeApi() {
  return {
    redrawRows: jest.fn(),
    refreshServerSide: jest.fn(),
    setGridOption: jest.fn(),
  } as any;
}

describe('row-model.strategy', () => {
  test('ClientSideStrategy configures filter and merges defaults', () => {
    const s = new ClientSideStrategy();
    const cfg = s.configureGridOptions({ defaultColDef: { sortable: true } } as any);
    expect(cfg.rowModelType).toBe('clientSide');
    expect(cfg.defaultColDef?.filter).toBe('agMultiColumnFilter');
    expect(cfg.defaultColDef?.sortable).toBe(true);
    // make sure defaults were layered (smoke test; relies on your defaultGridOptions export)
    expect(defaultGridOptions).toBeDefined();
  });

  test('ClientSideStrategy init/refresh', () => {
    const s = new ClientSideStrategy();
    const api = makeApi();
    s.init(api);
    s.refresh(api);
    expect(api.redrawRows).toHaveBeenCalled();
  });

  test('ServerSideStrategy config disables filter', () => {
    const s = new ServerSideStrategy();
    const cfg = s.configureGridOptions({ defaultColDef: { sortable: true } } as any);
    expect(cfg.rowModelType).toBe('serverSide');
    expect(cfg.defaultColDef?.filter).toBeNull();
  });

  test('ServerSideStrategy refresh triggers refreshServerSide', () => {
    const s = new ServerSideStrategy();
    const api = makeApi();
    s.refresh(api);
    expect((api as any).refreshServerSide).toHaveBeenCalledWith({ purge: false });
  });
});
