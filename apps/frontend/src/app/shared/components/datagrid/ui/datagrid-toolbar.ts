import { Component, computed, inject, viewChild } from '@angular/core';
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

  private readonly countFormatter = new Intl.NumberFormat();

  // viewChild (not template refs) because #filtersBtn sits inside an @if block,
  // out of scope for the phone menu's rows in the sibling subtree.
  private readonly filtersBtn = viewChild<GridActionComponent>('filtersBtn');
  private readonly columnsBtn = viewChild<GridActionComponent>('columnsBtn');

  /** Phone menu rows: open the (trigger-hidden) Filters/Columns picker sheet.
   *  The shared details[name] group closes the menu itself automatically. */
  public openFiltersPanel() {
    this.filtersBtn()?.openDropdown();
  }

  public openColumnsPanel() {
    this.columnsBtn()?.openDropdown();
  }

  readonly listOptions = computed<SingleSelectOption[]>(() =>
    this.grid.availableLists().map((l) => ({ value: String(l['id'] ?? ''), label: String(l['name'] ?? '') })),
  );

  /**
   * Export menu label, e.g. "Export 5,012 matching people" — mirrors the
   * count-sentence: "matching" only when a filter narrows the set, singular noun
   * at 1, and just "Export people" before the first load resolves a count.
   */
  readonly exportLabel = computed<string>(() => {
    const count = this.grid.totalCountAll();
    if (count <= 0) return `Export ${this.grid.entityNounPlural}`;
    const noun = count === 1 ? this.grid.entityNoun : this.grid.entityNounPlural;
    const matching = this.grid.anyFilterActive() ? 'matching ' : '';
    return `Export ${this.countFormatter.format(count)} ${matching}${noun}`;
  });

  /** Solid-primary create-button label (UX-GUIDELINES "Buttons"), e.g. "New person". Falls back
   *  to "New" when the grid config carries no specific entity noun. */
  readonly addLabel = computed(() => {
    const noun = this.grid.entityNoun;
    return noun && noun !== 'row' ? `New ${noun}` : 'New';
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
