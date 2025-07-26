import { ColDef, GridState, SideBarDef } from '@ag-grid-community/core';

export const BASE_GRID_CONFIG = {
  defaultColDef: {
    filter: 'agMultiColumnFilter',
    flex: 1,
    enableValue: true,
    enablePivot: true,
  } as ColDef,
  initialState: {
    sideBar: {
      openToolPanel: null,
      position: 'right',
      visible: true,
      toolPanels: {},
    },
  } as GridState,
  sideBar: {
    toolPanels: [
      {
        id: 'filters',
        labelDefault: 'Filters',
        labelKey: 'filters',
        iconKey: 'filter',
        toolPanel: 'agFiltersToolPanel',
        toolPanelParams: {
          suppressExpandAll: true,
          suppressFilterSearch: true,
        },
      },
      {
        id: 'columns',
        labelDefault: 'Columns',
        labelKey: 'columns',
        iconKey: 'columns',
        toolPanel: 'agColumnsToolPanel',
        toolPanelParams: {
          suppressRowGroups: true,
          suppressValues: true,
          suppressPivots: true,
          suppressPivotMode: true,
          suppressColumnSelectAll: true,
        },
      },
    ],
    defaultToolPanel: 'filters',
  } as SideBarDef,
};
