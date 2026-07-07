import { Component, computed, inject } from '@angular/core';
import { DataGrid } from '../datagrid';
import { DataGridColumnsDropdownComponent } from './datagrid-columns-dropdown';
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
    DataGridFilterSectionComponent,
  ],
  templateUrl: 'datagrid-toolbar.html',
})
export class DataGridToolbarComponent {
  public readonly grid = inject(DataGrid);

  readonly listOptions = computed<SingleSelectOption[]>(() =>
    this.grid.availableLists().map((l) => ({ value: String(l['id'] ?? ''), label: String(l['name'] ?? '') })),
  );

  /** Solid-primary Add button label (spec §5), e.g. "Add person". Falls back to "Add" when the
   *  grid config carries no specific entity noun. */
  readonly addLabel = computed(() => {
    const noun = this.grid.entityNoun;
    return noun && noun !== 'row' ? `Add ${noun}` : 'Add';
  });

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
