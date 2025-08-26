import { ShortcutCellRenderer } from '@uxcommon/components/shortcut-cell-renderer/shortcut-cell-renderer';

import { ColDef, GridOptions, GridState, NewFiltersToolPanelState, SideBarDef } from 'ag-grid-community';

import { DEFAULT_DATA_GRID_CONFIG } from './datagrid.tokens';

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
    enableValue: true,
    enablePivot: true,
  } as ColDef,

  /**
   * Initial grid state, including side bar position and visibility.
   */
  initialState: {
    sideBar: {
      enableFilterHandlers: true,
      openToolPanel: null,
      position: 'right',
      visible: false,
      toolPanels: {
        'filters-new': {
          filters: [
            {
              colId: 'tags',
              expanded: true,
            },
            {
              colId: 'first_name',
            },
          ],
        } as NewFiltersToolPanelState,
      },
    },
  } as GridState,

  /**
   * AG Grid sidebar definition including Filters and Columns panels.
   */
  sideBar: {
    toolPanels: [
      {
        id: 'filters-new',
        labelDefault: 'Filters',
        labelKey: 'filters',
        iconKey: 'filter',
        toolPanel: 'agNewFiltersToolPanel',
      },
    ],
    defaultToolPanel: 'filters-new',
    hiddenByDefault: true,
  } as SideBarDef,
};

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
 * Default grid options used to initialize AG Grid.
 * This is intended to be the common base for all grid instances in the app.
 */
export const defaultGridOptions: GridOptions = {
  animateRows: true,
  autoSizeStrategy: { type: 'fitCellContents' },
  defaultColDef: BASE_GRID_CONFIG.defaultColDef,
  initialState: BASE_GRID_CONFIG.initialState,
  sideBar: BASE_GRID_CONFIG.sideBar,
  suppressServerSideFullWidthLoadingRow: true,
  cellSelection: true,
  copyHeadersToClipboard: true,
  enableCellEditingOnBackspace: true,
  enableFilterHandlers: true,
  pagination: true,
  //paginationAutoPageSize: true,
  paginationPageSize: DEFAULT_DATA_GRID_CONFIG.pageSize,
  cacheBlockSize: DEFAULT_DATA_GRID_CONFIG.pageSize,
  rowSelection: {
    mode: 'multiRow',
    checkboxes: true,
  },
  rowStyle: { cursor: 'pointer' },
  stopEditingWhenCellsLoseFocus: true,
  undoRedoCellEditing: true,
  overlayLoadingTemplate: '<div class="loading loading-bars  loading-xl text-accent" />',
};
