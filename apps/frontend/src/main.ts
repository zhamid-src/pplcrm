import { bootstrapApplication } from "@angular/platform-browser";
import { AppComponent } from "./app/app.component";
import { appConfig } from "./app/app.config";

import { ClientSideRowModelModule } from "@ag-grid-community/client-side-row-model";
import { ModuleRegistry } from '@ag-grid-community/core';
import { CsvExportModule } from "@ag-grid-community/csv-export";

bootstrapApplication(AppComponent, appConfig).catch((err) =>
  console.error(err),
);
      
// Register ag-grid modules globally
ModuleRegistry.registerModules([
    ClientSideRowModelModule,
    CsvExportModule,
]);