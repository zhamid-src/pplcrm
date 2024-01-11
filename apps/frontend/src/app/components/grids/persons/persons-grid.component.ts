import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { UpdatePersonsType } from '@common';
import { AlertService } from '@services/alert.service';
import { BaseGridService } from '@services/grid/base-grid.service';
import { PersonsGridService, TYPE } from '@services/grid/persons-grid.service';
import { SearchService } from '@services/search.service';
import { ThemeService } from '@services/theme.service';
import { DatagridComponent } from '@uxcommon/datagrid/datagrid.component';

@Component({
  selector: 'pc-persons-grid',
  standalone: true,
  imports: [CommonModule, DatagridComponent],
  templateUrl: './persons-grid.component.html',
  styleUrl: './persons-grid.component.scss',
  providers: [{ provide: BaseGridService, useClass: PersonsGridService }],
})
export class PersonsGridComponent extends DatagridComponent<TYPE, UpdatePersonsType> {
  protected col = [
    {
      field: 'first_name',
      headerName: 'First Name',
      headerTooltip: 'First name',
      editable: true,
    },
    { field: 'last_name', headerName: 'Last Name', editable: true },
    { field: 'email', headerName: 'Email', editable: true },
    { field: 'mobile', headerName: 'Mobile', editable: true },
    {
      field: 'street1',
      headerName: 'Street',
      cellClass: 'text-gray-500 cursor-auto',
    },
    {
      field: 'city',
      headerName: 'City',
      cellClass: 'text-gray-500 cursor-auto',
    },
    { field: 'notes', headerName: 'Notes', editable: true },
  ];

  constructor(
    router: Router,
    themeSvc: ThemeService,
    serachSvc: SearchService,
    alertSvc: AlertService,
    gridSvc: PersonsGridService,
  ) {
    super(router, themeSvc, serachSvc, alertSvc, gridSvc);
  }
}
