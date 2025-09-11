import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { GridActionComponent } from '../tool-button';
import { Icon } from '@icons/icon';
import type { PcIconNameType } from '@icons/icons.index';
import type { ColumnDef as ColDef } from '../grid-defaults';

@Component({
  selector: 'pc-dg-toolbar',
  standalone: true,
  imports: [GridActionComponent, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ul class="menu menu-horizontal flex flex-row pt-0">
      <pc-grid-action [enabled]="!!addRoute()" [tip]="'Add'" [icon]="plusIcon()" (action)="add.emit()" />
      <pc-grid-action [enabled]="!disableRefresh()" [tip]="'Refresh the grid'" icon="arrow-path" (action)="refresh.emit()" />
      <pc-grid-action [enabled]="!!canUndo()" [tip]="'Undo'" icon="arrow-uturn-left" (action)="undo.emit()" />
      <pc-grid-action [enabled]="!!canRedo()" [tip]="'Redo'" icon="arrow-uturn-right" (action)="redo.emit()" />
      <pc-grid-action
        [enabled]="!disableDelete() && hasSelection()"
        [tip]="'Deleted selected row(s)'"
        icon="trash"
        (action)="deleteSelected.emit()"
      />
      <pc-grid-action [enabled]="canMerge()" [tip]="'Merge'" icon="merge" (action)="merge.emit()"></pc-grid-action>
      <pc-grid-action
        [enabled]="!disableImport()"
        [tip]="'Import data from CSV'"
        icon="arrow-up-tray"
        (action)="importCsv.emit()"
      />

      <pc-grid-action
        [enabled]="!disableExport()"
        [tip]="'Download as CSV'"
        icon="arrow-down-tray"
        (action)="exportCsv.emit()"
      />
      <pc-grid-action icon="funnel" tip="Filter the grid" [active]="showFilters()" (action)="toggleFilters.emit()" />

      <li class="dropdown dropdown-end">
        <label tabindex="0" class="btn btn-ghost btn-sm" title="Select columns">
          <pc-icon name="view-column"></pc-icon>
        </label>
        <ul tabindex="0" class="dropdown-content menu bg-base-100 rounded-box z-[1] w-64 p-2 shadow">
          <li class="px-2 py-1 flex gap-2">
            <button class="btn btn-ghost btn-xs" (click)="showAllCols.emit()">Show all</button>
            <button class="btn btn-ghost btn-xs" (click)="hideAllCols.emit()">Hide all</button>
            <button class="btn btn-ghost btn-xs" (click)="resetAllWidths.emit()">Reset widths</button>
          </li>
          @for (col of colDefs(); track col.field) { @if (col.field) {
          <li>
            <label class="label cursor-pointer justify-start gap-2">
              <input
                type="checkbox"
                class="checkbox checkbox-xs"
                [checked]="colVisibilityMap()?.[col.field!] !== false"
                (change)="toggleCol.emit({ field: col.field!, checked: $any($event.target).checked })"
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
        [hidden]="!showArchiveIcon()"
        [active]="archiveMode()"
        (action)="toggleArchive.emit()"
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
  // Inputs
  addRoute = input<string | null>(null);
  plusIcon = input<PcIconNameType>('plus');
  disableRefresh = input<boolean>(false);
  canUndo = input<boolean>(false);
  canRedo = input<boolean>(false);
  disableDelete = input<boolean>(false);
  hasSelection = input<boolean>(false);
  canMerge = input<boolean>(false);
  disableImport = input<boolean>(true);
  disableExport = input<boolean>(false);
  showFilters = input<boolean>(false);
  showArchiveIcon = input<boolean>(false);
  archiveMode = input<boolean>(false);
  colDefs = input<ColDef[]>([]);
  colVisibilityMap = input<Record<string, boolean>>({});

  // Outputs
  add = output<void>();
  refresh = output<void>();
  undo = output<void>();
  redo = output<void>();
  deleteSelected = output<void>();
  merge = output<void>();
  importCsv = output<void>();
  exportCsv = output<void>();
  toggleFilters = output<void>();
  showAllCols = output<void>();
  hideAllCols = output<void>();
  resetAllWidths = output<void>();
  toggleArchive = output<void>();
  toggleCol = output<{ field: string; checked: boolean }>();
}
