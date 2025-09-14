import { ChangeDetectionStrategy, Component, input, inject } from '@angular/core';
import type { ColumnDef as ColDef } from '../grid-defaults';
import { DataGrid } from '../datagrid';

@Component({
  selector: 'pc-dg-inline-filters-row',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <tr>
      @if (enableSelection()) {
      <th class="selection-col sticky left-0 z-30 bg-base-100" [style.width.px]="selectionStickyWidth()"></th>
      }
      @for (h of leafHeaders(); track h.id) { @if (h && h.column?.getIsVisible?.()) { @let col = getColDefById()(h.column.id);
      <th class="border-r border-base-300 bg-base-100">
        @if (col && getFilterOptionsForCol()(col)?.length) {
        <div class="dropdown dropdown-bottom w-full">
          <label tabindex="0" class="btn btn-ghost btn-xs w-full justify-between">
            <span>{{ inlineFilterLabel()(col!.field!) }}</span>
            <span>▾</span>
          </label>
          <ul tabindex="0" class="dropdown-content menu bg-base-100 rounded-box z-[100] w-60 p-2 shadow">
            @for (opt of getFilterOptionsForCol()(col!)!; track opt) {
            <li>
              <label class="label cursor-pointer justify-start gap-2 px-2 py-1">
                <input
                  type="checkbox"
                  class="checkbox checkbox-xs"
                  [checked]="isOptionChecked()(h.column.id, opt)"
                  (change)="onToggleFilterOption()(h.column.id, opt, $any($event.target).checked)"
                />
                <span class="label-text">{{ opt }}</span>
              </label>
            </li>
            }
            <li class="px-2 pt-1"><a (click)="clearHeaderFilter()(h.column.id)">Clear</a></li>
          </ul>
        </div>
        } @else {
        <input
          class="input input-bordered input-xs w-full"
          type="text"
          placeholder="Filter value"
          [value]="getFilterValue()(h.column.id)"
          (input)="onHeaderFilterInput()(h.column.id, $any($event.target).value)"
        />
        }
      </th>
      } }
    </tr>
  `,
})
export class DataGridInlineFiltersRowComponent {
  private readonly grid = inject<DataGrid<any, any>>(DataGrid as any, { optional: true });

  enableSelection = input<boolean>(true);
  selectionStickyWidth = input<number>(48);
  leafHeaders = input<any[]>([]);

  getColDefById = input<(id: string) => ColDef | undefined>((id) => this.grid?.getColDefById(id));
  getFilterOptionsForCol = input<(col: ColDef) => string[] | null>((c) => this.grid?.getFilterOptionsForCol(c) ?? null);
  inlineFilterLabel = input<(field: string) => string>((f) => this.grid?.inlineFilterLabel?.(f) ?? '');
  isOptionChecked = input<(field: string, option: string) => boolean>((f, o) => !!this.grid?.isOptionChecked(f, o));
  onToggleFilterOption = input<(field: string, option: string, checked: boolean) => void>((f, o, c) =>
    this.grid?.onToggleFilterOption(f, o, c),
  );
  onHeaderFilterInput = input<(field: string, value: any) => void>((f, v) => this.grid?.onHeaderFilterInput(f, v));
  clearHeaderFilter = input<(field: string) => void>((f) => this.grid?.clearHeaderFilter(f));
  getFilterValue = input<(field: string) => string>((f) => this.grid?.getFilterValue(f) ?? '');
}
