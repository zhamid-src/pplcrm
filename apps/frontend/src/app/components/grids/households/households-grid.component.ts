import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { UpdateHouseholdsObj } from '@common';
import { AlertService } from '@services/alert.service';
import { AbstractBackendService } from '@services/backend/abstract.service';
import { HouseholdsBackendService } from '@services/backend/households.service';
import { SearchService } from '@services/search.service';
import { ThemeService } from '@services/theme.service';
import { DatagridComponent } from '@uxcommon/datagrid/datagrid.component';
import { CellDoubleClickedEvent, GridOptions } from 'ag-grid-community';
import { TagsCellRendererComponent } from '../tags-cell-renderer/tagsCellRenderer.component';

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
    { field: 'persons_count', headerName: 'People in household' },
    { field: 'street_num', headerName: 'Street Number', editable: true },
    { field: 'street', headerName: 'Street', editable: true },
    { field: 'apt', headerName: 'Apt', editable: true },
    { field: 'city', headerName: 'City', editable: true },
    {
      field: 'tags',
      headerName: 'Tags',
      cellRenderer: TagsCellRendererComponent,
      equals: (valueA: string[], valueB: string[]) => valueA?.toString() === valueB?.toString(),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      valueFormatter: (params: any) =>
        (!params?.value || !params.value[0] ? [] : params.value)?.toString(),
      comparator: (valueA: string[], valueB: string[]) =>
        valueA.toString().localeCompare(valueB.toString()),
      cellDataType: 'object',
      cellRendererParams: {
        type: 'households',
        obj: UpdateHouseholdsObj,
        service: this.gridSvc,
      },
    },
    { field: 'state', headerName: 'State/Province', editable: true },
    { field: 'zip', headerName: 'Zip/Province', editable: true },
    { field: 'country', headerName: 'Country', editable: true },
    { field: 'home_phone', headerName: 'Home phone', editable: true },
    { field: 'notes', headerName: 'Notes', editable: true },
  ];
  protected myGridOptions: GridOptions = {
    onCellDoubleClicked: this.onCellDoubleClicked.bind(this),
  };

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

  protected onCellDoubleClicked(event: CellDoubleClickedEvent) {
    if (event.colDef.field === 'tags') {
      this.openEdit(event.data.id);
    }
  }
}
