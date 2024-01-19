import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AlertService } from '@services/alert.service';
import { AbstractBackendService } from '@services/backend/abstract.service';
import { HouseholdsBackendService } from '@services/backend/households.service';
import { SearchService } from '@services/search.service';
import { ThemeService } from '@services/theme.service';
import { DatagridComponent } from '@uxcommon/datagrid/datagrid.component';

@Component({
  selector: 'pc-households-grid',
  standalone: true,
  imports: [CommonModule, DatagridComponent],
  templateUrl: './households-grid.component.html',
  styleUrl: './households-grid.component.scss',
  providers: [{ provide: AbstractBackendService, useClass: HouseholdsBackendService }],
})

/**
 * This is the households grid component used to display the list of households.
 * It also gets the number of people that belong to each household.
 *
 * @see {@link DatagridComponent}
 */
export class HouseholdsGridComponent extends DatagridComponent<'households', never> {
  protected col = [
    { field: 'person_count', headerName: 'People in household' },
    { field: 'street1', headerName: 'Street' },
    { field: 'street2', headerName: 'Street line 2' },
    { field: 'city', headerName: 'City' },
    { field: 'state', headerName: 'State/Province' },
    { field: 'zip', headerName: 'Zip/Province' },
    { field: 'country', headerName: 'Country' },
    { field: 'home_phone', headerName: 'Home phone' },
    { field: 'notes', headerName: 'Notes' },
  ];

  constructor(
    router: Router,
    route: ActivatedRoute,
    themeSvc: ThemeService,
    serachSvc: SearchService,
    alertSvc: AlertService,
    gridSvc: HouseholdsBackendService,
  ) {
    super(router, route, themeSvc, serachSvc, alertSvc, gridSvc);
  }
}
