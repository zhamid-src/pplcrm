import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { UpdatePersonsType } from '@common';
import { AlertService } from '@services/alert.service';
import { AbstractBackendService } from '@services/backend/abstract.service';
import { PersonsBackendService, TYPE } from '@services/backend/persons.service';
import { SearchService } from '@services/search.service';
import { ThemeService } from '@services/theme.service';
import { DatagridComponent } from '@uxcommon/datagrid/datagrid.component';
import { IconsComponent } from '@uxcommon/icons/icons.component';
import { CellDoubleClickedEvent, GridOptions } from 'ag-grid-community';
import { TagsCellRendererComponent } from '../tags-cell-renderer/tagsCellRenderer.component';

@Component({
  selector: 'pc-persons-grid',
  standalone: true,
  imports: [CommonModule, DatagridComponent, IconsComponent],
  templateUrl: './persons-grid.component.html',
  styleUrl: './persons-grid.component.scss',
  providers: [{ provide: AbstractBackendService, useClass: PersonsBackendService }],
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
      field: 'tags',
      headerName: 'Tags',
      filter: false,
      cellRenderer: TagsCellRendererComponent,
    },
    {
      field: 'address',
      headerName: 'Address',
      cellClass: 'text-gray-500 cursor-auto',
    },

    { field: 'notes', headerName: 'Notes', editable: true },
  ];

  private addressChangeModalId: string | null = null;

  /**
   * Hook into the double click so we can open the address change modal
   */
  protected myGridOptions: GridOptions<Partial<TYPE>> = {
    onCellDoubleClicked: this.onCellDoubleClicked.bind(this),
  };
  constructor(
    router: Router,
    route: ActivatedRoute,
    themeSvc: ThemeService,
    serachSvc: SearchService,
    alertSvc: AlertService,
    gridSvc: PersonsBackendService,
  ) {
    super(router, route, themeSvc, serachSvc, alertSvc, gridSvc);
  }

  protected onCellDoubleClicked(event: CellDoubleClickedEvent) {
    console.log(event.colDef.field);
    if (event.colDef.field === 'address') {
      this.addressChangeModalId = event.data.id;
      this.confirmAddressChange();
    } else if (event.colDef.field === 'tags') {
      this.openEdit(event.data.id);
    }
  }

  protected routeToHouseholds() {
    const dialog = document.querySelector('#confirmAddressEdit') as HTMLDialogElement;
    dialog.close();

    if (this.addressChangeModalId !== null) {
      this.router.navigate(['console', 'households', this.addressChangeModalId]);
    }
  }

  /**
   * Confirm if the user actually wants to change the address
   *
   */
  private confirmAddressChange(): void {
    const dialog = document.querySelector('#confirmAddressEdit') as HTMLDialogElement;
    dialog.showModal();
  }
}
