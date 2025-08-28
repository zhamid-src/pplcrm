import { Component, ViewChild, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AddListType, UpdatePersonsType, UpdateHouseholdsType, getAllOptionsType } from '@common';
import { ListsService } from '@experiences/lists/services/lists-service';
import { PersonsService } from '@experiences/persons/services/persons-service';
import { HouseholdsService } from '@experiences/households/services/households-service';
import { DataGrid } from '@uxcommon/components/datagrid/datagrid';
import { AddBtnRow } from '@uxcommon/components/add-btn-row/add-btn-row';
import { FormInput } from '@uxcommon/components/form-input/formInput';
import { AlertService } from '@uxcommon/components/alerts/alert-service';
import { createLoadingGate } from '@uxcommon/loading-gate';
import { SearchService } from '@services/api/search-service';
import { AbstractAPIService } from '@services/api/abstract-api.service';
import { ColDef } from 'ag-grid-community';

/** Grid component for filtering people when creating lists */
@Component({
  selector: 'pc-people-filter-grid',
  imports: [DataGrid],
  template: `<pc-datagrid
    [colDefs]="col"
    [disableDelete]="true"
    [disableExport]="true"
    [disableImport]="true"
    [disableRefresh]="true"
    [disableView]="true"
  ></pc-datagrid>`,
  providers: [{ provide: AbstractAPIService, useClass: PersonsService }],
})
export class PeopleFilterGrid extends DataGrid<'persons', UpdatePersonsType> {
  protected col: ColDef[] = [
    { field: 'first_name', headerName: 'First Name' },
    { field: 'last_name', headerName: 'Last Name' },
    { field: 'email', headerName: 'Email' },
    { field: 'mobile', headerName: 'Mobile' },
    { field: 'tags', headerName: 'Tags', filter: 'agSetColumnFilter' },
    { field: 'city', headerName: 'City' },
    { field: 'state', headerName: 'State' },
    { field: 'zip', headerName: 'Zip' },
  ];
}

/** Grid component for filtering households when creating lists */
@Component({
  selector: 'pc-household-filter-grid',
  imports: [DataGrid],
  template: `<pc-datagrid
    [colDefs]="col"
    [disableDelete]="true"
    [disableExport]="true"
    [disableImport]="true"
    [disableRefresh]="true"
    [disableView]="true"
  ></pc-datagrid>`,
  providers: [{ provide: AbstractAPIService, useClass: HouseholdsService }],
})
export class HouseholdFilterGrid extends DataGrid<'households', UpdateHouseholdsType> {
  protected col: ColDef[] = [
    { field: 'street1', headerName: 'Street 1' },
    { field: 'city', headerName: 'City' },
    { field: 'state', headerName: 'State' },
    { field: 'zip', headerName: 'Zip' },
    { field: 'people_count', headerName: 'People' },
    { field: 'tags', headerName: 'Tags', filter: 'agSetColumnFilter' },
  ];
}

/** Component for creating new lists. Allows building static or dynamic lists using filters. */
@Component({
  selector: 'pc-list-detail',
  imports: [ReactiveFormsModule, FormInput, AddBtnRow, PeopleFilterGrid, HouseholdFilterGrid],
  templateUrl: './list-detail.html',
})
export class ListDetail {
  private readonly fb = inject(FormBuilder);
  private readonly listsSvc = inject(ListsService);
  private readonly alertSvc = inject(AlertService);
  private readonly searchSvc = inject(SearchService);

  private _loading = createLoadingGate();
  protected isLoading = this._loading.visible;

  protected form = this.fb.group({
    name: ['', [Validators.required]],
    description: [''],
    object: ['people'],
    is_dynamic: [false],
  });

  @ViewChild(PeopleFilterGrid) private peopleGrid?: PeopleFilterGrid;
  @ViewChild(HouseholdFilterGrid) private householdsGrid?: HouseholdFilterGrid;

  /** Save the list using current filters */
  protected save(done: () => void) {
    const formValue = this.form.getRawValue();
    const gridApi =
      formValue.object === 'people'
        ? this.peopleGrid?.api
        : this.householdsGrid?.api;

    const definition: getAllOptionsType = {
      searchStr: this.searchSvc.getFilterText(),
      filterModel: gridApi?.getFilterModel() ?? {},
      sortModel: gridApi?.getSortModel() ?? [],
    } as getAllOptionsType;

    const payload: AddListType = {
      name: formValue.name!,
      description: formValue.description ?? null,
      object: formValue.object as 'people' | 'households',
      is_dynamic: formValue.is_dynamic ?? false,
      definition,
    };

    const end = this._loading.begin();
    this.listsSvc
      .add(payload)
      .then(() => {
        this.alertSvc.showSuccess('List added');
        done();
      })
      .catch((err: unknown) => this.alertSvc.showError(String(err)))
      .finally(() => end());
  }
}

