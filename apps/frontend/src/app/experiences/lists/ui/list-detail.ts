import { Component, ViewChild, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AddListType, UpdateHouseholdsType, UpdatePersonsType } from '@common';
import { HouseholdsService } from '@experiences/households/services/households-service';
import { ListsService } from '@experiences/lists/services/lists-service';
import { PersonsService } from '@experiences/persons/services/persons-service';
import { AbstractAPIService } from '@services/api/abstract-api.service';
import { AddBtnRow } from '@uxcommon/components/add-btn-row/add-btn-row';
import { AlertService } from '@uxcommon/components/alerts/alert-service';
import { DataGrid } from '@uxcommon/components/datagrid/datagrid';
import { FormInput } from '@uxcommon/components/form-input/formInput';
import { createLoadingGate } from '@uxcommon/loading-gate';

import { ColDef } from 'ag-grid-community';

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

/** Component for creating new lists. Allows building static or dynamic lists using filters. */
@Component({
  selector: 'pc-list-detail',
  imports: [ReactiveFormsModule, FormInput, AddBtnRow, PeopleFilterGrid, HouseholdFilterGrid],
  templateUrl: './list-detail.html',
})
export class ListDetail {
  private readonly alertSvc = inject(AlertService);
  private readonly countRowSelected = signal(0);
  private readonly fb = inject(FormBuilder);
  private readonly listsSvc = inject(ListsService);

  private _loading = createLoadingGate();
  @ViewChild(HouseholdFilterGrid) private householdGrid?: HouseholdFilterGrid;
  @ViewChild(PeopleFilterGrid) private peopleGrid?: PeopleFilterGrid;

  protected btnLabel = signal('SAVE');
  protected form = this.fb.group({
    name: ['', [Validators.required]],
    description: [''],
    object: ['people'],
    is_dynamic: [false],
  });
  protected isLoading = this._loading.visible;
  protected listType = toSignal(this.form.get('object')!.valueChanges, {
    initialValue: this.form.get('object')!.value,
  });

  constructor() {
    effect(() => {
      const type = this.listType();
      console.log(type);
      if (type === 'people') {
        this.countRowSelected.set(this.peopleGrid?.getCountRowSelected() ?? 0);
      } else {
        this.countRowSelected.set(this.householdGrid?.getCountRowSelected() ?? 0);
      }

      this.btnLabel.set(this.countRowSelected() > 0 ? `SAVE (${this.countRowSelected()} selected)` : 'SAVE');
    });
  }

  /** Save the list using selection for static, or filters for dynamic */
  protected save(done: () => void) {
    const formValue = this.form.getRawValue();

    const payload: AddListType = {
      name: formValue.name!,
      description: formValue.description ?? null,
      object: formValue.object as 'people' | 'households',
      is_dynamic: formValue.is_dynamic ?? false,
    };

    if (payload.is_dynamic) {
      // Dynamic lists: use current filters/search as definition
      const def = payload.object === 'people' ? this.peopleGrid?.getDefinition() : this.householdGrid?.getDefinition();
      if (def) payload.definition = def;
    } else {
      // Static lists: include only selected IDs
      const selected =
        payload.object === 'people' ? this.peopleGrid?.getSelectedRows() : this.householdGrid?.getSelectedRows();
      const ids = (selected ?? []).map((r) => r.id).filter(Boolean);
      if (!ids.length) {
        this.alertSvc.showError('Please select at least one row');
        return;
      }
      if (ids.length) (payload as any).member_ids = ids;
    }

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
