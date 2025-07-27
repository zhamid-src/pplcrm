import { ColDef, GridOptions, GridState, SideBarDef } from '@ag-grid-community/core';
import { ShortcutCellRenderer } from '@uxcommon/shortcut-cell-renderer';
import { LoadingOverlayComponent } from './loading-overlay';

/**
 * The default selection column shown in all AG Grid tables.
 * This column appears on the left and includes a checkbox for multi-row selection.
 */
export const SELECTION_COLUMN: ColDef = {
  filter: false,
  sortable: false,
  cellClass: 'px-0 pt-2 mx-0 w-12',
  resizable: false,
  enableCellChangeFlash: true,
  lockVisible: true,
  lockPosition: true,
  suppressMovable: true,
  suppressHeaderMenuButton: true,
  pinned: 'left',
  lockPinned: true,
  cellRenderer: ShortcutCellRenderer,
};

/**
 * Base grid configuration including default column definition,
 * initial grid state, and sidebar tool panel configuration.
 * These settings are reused across all grid instances.
 */
const BASE_GRID_CONFIG = {
  /**
   * Default column definition applied to all columns unless overridden.
   */
  defaultColDef: {
    enableCellChangeFlash: true,
    filter: 'agMultiColumnFilter',
    flex: 1,
    enableValue: true,
    enablePivot: true,
  } as ColDef,

  /**
   * Initial grid state, including side bar position and visibility.
   */
  initialState: {
    sideBar: {
      openToolPanel: null,
      position: 'right',
      visible: true,
      toolPanels: {},
    },
  } as GridState,

  /**
   * AG Grid sidebar definition including Filters and Columns panels.
   */
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

/**
 * Default grid options used to initialize AG Grid.
 * This is intended to be the common base for all grid instances in the app.
 */
export const defaultGridOptions: GridOptions = {
  animateRows: true,
  autoSizeStrategy: { type: 'fitCellContents' },
  defaultColDef: BASE_GRID_CONFIG.defaultColDef,
  initialState: BASE_GRID_CONFIG.initialState,
  sideBar: BASE_GRID_CONFIG.sideBar,
  cellSelection: true,
  copyHeadersToClipboard: true,
  enableCellEditingOnBackspace: true,
  pagination: true,
  paginationAutoPageSize: true,
  rowSelection: {
    mode: 'multiRow',
    checkboxes: true,
  },
  rowStyle: { cursor: 'pointer' },
  stopEditingWhenCellsLoseFocus: true,
  undoRedoCellEditing: true,
  loadingOverlayComponent: LoadingOverlayComponent,
};
