import { InjectionToken, Provider } from '@angular/core';
import type { BaseDialogOptions } from '@uxcommon/shared-dialog-service';

export interface DataGridConfig {
  clientServerThreshold: number;
  filterToolPanelId: string;
  messages: {
    noDeletePermission: string;
    editBlocked: string;
    editFailed: string;
    loadFailed: string;

    deleteConfirmTitle: string;
    deleteConfirmMessage: string;
    deleteConfirmIcon: BaseDialogOptions['icon'];
    deleteConfirmVariant: 'danger' | 'info' | 'warning' | 'success';
    deleteConfirmText: string;
    deleteCancelText: string;
    deleteNoneSelected: string;
    deleteSystemValues: string;
    deleteFailed: string;
    deleteSuccess: string;

    exportTitle: string;
    exportMessage: string;
    exportIcon: BaseDialogOptions['icon'];
    exportConfirmText: string;
    exportCancelText: string;
    exportFailed: string;
  };
  pageSize: number;
}

export function provideDataGridConfig(overrides?: Partial<DataGridConfig>): Provider {
  const merged: DataGridConfig = {
    ...DEFAULT_DATA_GRID_CONFIG,
    ...overrides,
    messages: {
      ...DEFAULT_DATA_GRID_CONFIG.messages,
      ...(overrides?.messages ?? {}),
    },
  };
  return { provide: DATA_GRID_CONFIG, useValue: merged };
}

export const DATA_GRID_CONFIG = new InjectionToken<DataGridConfig>('DATA_GRID_CONFIG');

/** Default config used when no provider is registered */
export const DEFAULT_DATA_GRID_CONFIG: DataGridConfig = {
  pageSize: 10,
  clientServerThreshold: 15,
  filterToolPanelId: 'filters-new',
  messages: {
    noDeletePermission: 'You do not have the permission to delete rows from this table.',
    editBlocked: 'This cell cannot be edited or deleted.',
    editFailed: 'Could not edit the row. Please try again later.',
    loadFailed: 'Could not load the data. Please try again later.',

    deleteConfirmTitle: 'Are you sure?',
    deleteConfirmMessage: 'The selected rows will be deleted permanently. You cannot undo this.',
    deleteConfirmIcon: 'trash',
    deleteConfirmVariant: 'danger',
    deleteConfirmText: 'Delete',
    deleteCancelText: 'Cancel',
    deleteNoneSelected: 'Please select at least one row to delete.',
    deleteSystemValues: 'Some rows cannot be deleted because these are system values.',
    deleteFailed: 'Could not delete. Please try again later.',
    deleteSuccess: 'Selected rows were successfully deleted.',

    exportTitle: 'Export limitation',
    exportMessage:
      'This only exports the columns visible in the grid. If you’d like to export everything, use the Export component from the sidebar.',
    exportIcon: 'arrow-down-tray',
    exportConfirmText: 'Accept',
    exportCancelText: 'Cancel',
    exportFailed: 'Export failed. Please try again.',
  },
};
