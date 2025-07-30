import { bootstrapApplication } from '@angular/platform-browser';

import { AllCommunityModule, ClientSideRowModelModule, CsvExportModule, ModuleRegistry } from 'ag-grid-community';
import {
  CellSelectionModule,
  ClipboardModule,
  ColumnMenuModule,
  ContextMenuModule,
  GroupFilterModule,
  MultiFilterModule,
  NewFiltersToolPanelModule,
  PivotModule,
  RowGroupingModule,
  RowGroupingPanelModule,
  SetFilterModule,
  TreeDataModule,
} from 'ag-grid-enterprise';

import { AppComponent } from './app/app';
import { appConfig } from './app/app.config';

bootstrapApplication(AppComponent, appConfig).catch((err) => console.error(err));

// Register ag-grid modules globally
ModuleRegistry.registerModules([
  ClientSideRowModelModule,
  AllCommunityModule,
  CsvExportModule,
  CellSelectionModule,
  ClipboardModule,
  SetFilterModule,
  ColumnMenuModule,
  ContextMenuModule,
  RowGroupingPanelModule,
  RowGroupingModule,
  GroupFilterModule,
  TreeDataModule,
  PivotModule,
  MultiFilterModule,
  NewFiltersToolPanelModule,
]);
