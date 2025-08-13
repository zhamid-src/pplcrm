import type { GridApi, GridOptions } from 'ag-grid-community';

import { defaultGridOptions } from './grid-defaults';

export interface RowModelStrategy {
  configureGridOptions(opts: Partial<GridOptions>): Partial<GridOptions>;
  init(api: GridApi): void | Promise<void>;
  refresh(api: GridApi): void | Promise<void>;
}

export class ClientSideStrategy implements RowModelStrategy {
  public configureGridOptions(opts: Partial<GridOptions>): Partial<GridOptions> {
    return {
      ...defaultGridOptions,
      ...opts,
      rowModelType: 'clientSide',
      defaultColDef: {
        ...defaultGridOptions.defaultColDef,
        ...(opts.defaultColDef || {}),
        filter: 'agMultiColumnFilter',
      },
    };
  }

  public init(_api: GridApi) {
    // Nothing special for client-side
  }

  public refresh(api: GridApi) {
    // On component.refresh(), the component handles fetching and setting rowData.
    api.redrawRows();
  }
}

export class ServerSideStrategy implements RowModelStrategy {
  public configureGridOptions(opts: Partial<GridOptions>): Partial<GridOptions> {
    return {
      ...defaultGridOptions,
      ...opts,
      rowModelType: 'serverSide',
      defaultColDef: {
        ...defaultGridOptions.defaultColDef,
        ...(opts.defaultColDef || {}),
        // Server-side: disable client filter by default to avoid confusion
        filter: null as any,
      },
    };
  }

  public init(api: GridApi) {
    // Datasource is attached from the component.
    (api as any).setGridOption?.('serverSideEnableClientSideSort', false);
  }

  public refresh(api: GridApi) {
    (api as any).refreshServerSide?.({ purge: true });
  }
}
