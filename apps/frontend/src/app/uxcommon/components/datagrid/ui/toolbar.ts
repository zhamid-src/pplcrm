import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { GridActionComponent } from '../tool-button';
import { Icon } from '@icons/icon';
import { DataGrid } from '../datagrid';

@Component({
  selector: 'pc-dg-toolbar',
  standalone: true,
  imports: [GridActionComponent, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ul class="menu menu-horizontal flex flex-row pt-0">
      <pc-grid-action [enabled]="!!grid.addRoute?.()" [tip]="'Add'" [icon]="grid.plusIcon()" (action)="onAdd()" />
      <pc-grid-action [enabled]="!grid.disableRefresh()" [tip]="'Refresh the grid'" icon="arrow-path" (action)="onRefresh()" />
      <pc-grid-action [enabled]="!!grid.canUndo()" [tip]="'Undo'" icon="arrow-uturn-left" (action)="onUndo()" />
      <pc-grid-action [enabled]="!!grid.canRedo()" [tip]="'Redo'" icon="arrow-uturn-right" (action)="onRedo()" />
      <pc-grid-action
        [enabled]="!grid.disableDelete() && grid.hasSelectionState()"
        [tip]="'Deleted selected row(s)'"
        icon="trash"
        (action)="onDeleteSelected()"
      />
      
      <pc-grid-action
        [enabled]="!grid.disableImport()"
        [tip]="'Import data from CSV'"
        icon="arrow-up-tray"
        (action)="onImportCsv()"
      />

      <pc-grid-action
        [enabled]="!grid.disableExport()"
        [tip]="'Download as CSV'"
        icon="arrow-down-tray"
        (action)="onExportCsv()"
      />
      <pc-grid-action
        icon="funnel"
        tip="Filter the grid"
        [hidden]="!grid.allowFilter()"
        [active]="grid.showFiltersState()"
        (action)="onToggleFilters()"
      />

      <li class="dropdown dropdown-end">
        <label tabindex="0" class="btn btn-ghost btn-sm" title="Select columns">
          <pc-icon name="view-column"></pc-icon>
        </label>
        <ul tabindex="0" class="dropdown-content menu bg-base-100 rounded-box z-[1] w-64 p-2 shadow">
          <li class="px-2 py-1 flex gap-2">
            <button class="btn btn-ghost btn-xs" (click)="onShowAllCols()">Show all</button>
            <button class="btn btn-ghost btn-xs" (click)="onHideAllCols()">Hide all</button>
            <button class="btn btn-ghost btn-xs" (click)="onResetAllWidths()">Reset widths</button>
          </li>
          @for (col of grid.getColDefsForToolbar(); track col.field) { @if (col.field) {
          <li>
            <label class="label cursor-pointer justify-start gap-2">
              <input
                type="checkbox"
                class="checkbox checkbox-xs"
                [checked]="grid.getColVisibilityMap()[col.field!] !== false"
                (change)="onToggleCol(col.field!, $any($event.target).checked)"
              />
              <span class="label-text">{{ col.headerName || col.field }}</span>
            </label>
          </li>
          } }
        </ul>
      </li>

      <pc-grid-action
        icon="archive-box"
        tip="See archived tasks"
        [hidden]="!grid.showArchiveIcon()"
        [active]="grid.archiveModeState()"
        (action)="onToggleArchive()"
      />
      <li class="grow">
        <a class="hover:text-primary ml-auto">
          <pc-icon name="information-circle"></pc-icon>
        </a>
      </li>
    </ul>
  `,
})
export class DataGridToolbarComponent {
  public readonly grid = inject<DataGrid<any, any>>(DataGrid as any);

  onAdd() { this.grid.doAdd(); }
  onRefresh() { this.grid.doRefresh(); }
  onUndo() { this.grid.undo(); }
  onRedo() { this.grid.redo(); }
  onDeleteSelected() { this.grid.doConfirmDelete(); }
  onImportCsv() { this.grid.doImportCSV(); }
  onExportCsv() { this.grid.doConfirmExport(); }
  onToggleFilters() { this.grid.filter(); }
  onShowAllCols() { this.grid.showAllColsPublic(); }
  onHideAllCols() { this.grid.hideAllColsPublic(); }
  onResetAllWidths() { this.grid.resetAllWidthsPublic(); }
  onToggleArchive() { this.grid.toggleArchiveModePublic(); }
  onToggleCol(field: string, checked: boolean) { this.grid.toggleColPublic(field, checked); }
}
