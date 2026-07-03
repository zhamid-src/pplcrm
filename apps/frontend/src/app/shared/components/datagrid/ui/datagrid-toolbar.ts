import { Component, computed, inject } from '@angular/core';
import { DataGrid } from '../datagrid';
import { DataGridColumnsDropdownComponent } from './datagrid-columns-dropdown';
import { DataGridFilterDropdownComponent } from './datagrid-filter-dropdown';
import { DataGridFilterSectionComponent } from './datagrid-filter-section';
import { GridActionComponent } from '../tool-button';
import { Icon } from '@icons/icon';
import { MultiselectFilterComponent } from './multiselect-filter';
import { SingleselectFilterComponent, SingleSelectOption } from './singleselect-filter';

@Component({
  selector: 'pc-dg-toolbar',
  imports: [
    GridActionComponent,
    Icon,
    MultiselectFilterComponent,
    SingleselectFilterComponent,
    DataGridColumnsDropdownComponent,
    DataGridFilterDropdownComponent,
    DataGridFilterSectionComponent,
  ],
  templateUrl: 'datagrid-toolbar.html',
})
export class DataGridToolbarComponent {
  public readonly grid = inject(DataGrid);

  // narrowTypeOptions may include a null "All" sentinel value; SingleSelectOption
  // types value as string, but the sentinel must round-trip unchanged for the
  // datagrid's own `o.value === selected` matching to keep working.
  readonly narrowTypeOptions = computed<SingleSelectOption[]>(
    () => this.grid.narrowTypeOptions() as unknown as SingleSelectOption[],
  );
  readonly listOptions = computed<SingleSelectOption[]>(() =>
    this.grid.availableLists().map((l) => ({ value: String(l['id'] ?? ''), label: String(l['name'] ?? '') })),
  );

  public onAdd() {
    this.grid.doAdd();
  }

  public onClone() {
    this.grid.doClone();
  }

  public onMergeSelected() {
    this.grid.doConfirmMerge();
  }

  public onDeleteSelected() {
    this.grid.doConfirmDelete();
  }

  public onExportCsv() {
    this.grid.doConfirmExport();
  }

  public onImportCsv() {
    this.grid.doImportCSV();
  }

  public onRedo() {
    this.grid.redo();
  }

  public onRefresh() {
    void this.grid.doRefresh();
  }

  public onToggleArchive() {
    this.grid.toggleArchiveModePublic();
  }

  public onToggleFilters() {
    this.grid.filter();
  }

  public onUndo() {
    this.grid.undo();
  }

  public onResetAllWidths() {
    this.grid.resetAllWidthsPublic();
  }

  public onHideAllCols() {
    this.grid.hideAllColsPublic();
  }

  public onShowAllCols() {
    this.grid.showAllColsPublic();
  }

  public onToggleCol(colId: string, visible: boolean) {
    this.grid.toggleColPublic(colId, visible);
  }
}
