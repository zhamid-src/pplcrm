import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Icon } from '@icons/icon';

import { DataGrid } from '../datagrid';
import { GridActionComponent } from '../tool-button';

@Component({
  selector: 'pc-dg-toolbar',
  standalone: true,
  imports: [GridActionComponent, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: 'datagrid-toolbar.html',
})
export class DataGridToolbarComponent {
  public readonly grid: any = inject(DataGrid);

  public onAdd() {
    this.grid.doAdd();
  }

  public onDeleteSelected() {
    this.grid.doConfirmDelete();
  }

  public onExportCsv() {
    this.grid.doConfirmExport();
  }

  public onHideAllCols() {
    this.grid.hideAllColsPublic();
  }

  public onImportCsv() {
    this.grid.doImportCSV();
  }

  public onRedo() {
    this.grid.redo();
  }

  public onRefresh() {
    this.grid.doRefresh();
  }

  public onResetAllWidths() {
    this.grid.resetAllWidthsPublic();
  }

  public onShowAllCols() {
    this.grid.showAllColsPublic();
  }

  public onToggleArchive() {
    this.grid.toggleArchiveModePublic();
  }

  public onToggleCol(field: string, checked: boolean) {
    this.grid.toggleColPublic(field, checked);
  }

  public onToggleFilters() {
    this.grid.filter();
  }

  public onUndo() {
    this.grid.undo();
  }
}
