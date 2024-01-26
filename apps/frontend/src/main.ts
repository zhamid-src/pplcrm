import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { appConfig } from './app/app.config';

import { ClientSideRowModelModule } from '@ag-grid-community/client-side-row-model';
import { ModuleRegistry } from '@ag-grid-community/core';
import { CsvExportModule } from '@ag-grid-community/csv-export';
import { ClipboardModule } from '@ag-grid-enterprise/clipboard';
import { ColumnsToolPanelModule } from '@ag-grid-enterprise/column-tool-panel';
import { FiltersToolPanelModule } from '@ag-grid-enterprise/filter-tool-panel';
import { MenuModule } from '@ag-grid-enterprise/menu';
import { MultiFilterModule } from '@ag-grid-enterprise/multi-filter';
import { RangeSelectionModule } from '@ag-grid-enterprise/range-selection';
import { SetFilterModule } from '@ag-grid-enterprise/set-filter';

bootstrapApplication(AppComponent, appConfig).catch((err) => console.error(err));

// Register ag-grid modules globally
ModuleRegistry.registerModules([
  ClientSideRowModelModule,
  CsvExportModule,
  RangeSelectionModule,
  ClipboardModule,
  SetFilterModule,
  MenuModule,
  FiltersToolPanelModule,
  ColumnsToolPanelModule,
  MultiFilterModule,
]);
