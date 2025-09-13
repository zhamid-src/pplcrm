import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Icon } from '@icons/icon';
import type { PcIconNameType } from '@icons/icons.index';

import { HeaderReorderDirective } from '../directives/header-reorder.directive';
import { HeaderResizeDirective } from '../directives/header-resize.directive';
import type { ColumnDef as ColDef } from '../grid-defaults';

@Component({
  selector: 'pc-dg-header',
  standalone: true,
  imports: [Icon, HeaderReorderDirective, HeaderResizeDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @for (grp of groups(); track grp.id; let i = $index) {
    <tr>
      @if (enableSelection() && i === 0) {
      <th
        class="selection-col sticky left-0 z-30 bg-base-100 relative overflow-hidden"
        [attr.rowspan]="groups().length"
        [style.width.px]="selectionStickyWidth()"
      >
        <input
          type="checkbox"
          class="checkbox checkbox-sm"
          [checked]="!allSelected() && tableAllPageSelected()"
          [indeterminate]="!allSelected() && tableSomePageSelected()"
          (change)="onHeaderCheckbox()($any($event.target).checked)"
        />
        <span class="pointer-events-none absolute top-0 right-0 h-full w-px bg-base-300/80 z-[15]"></span>
        <span
          class="absolute top-0 right-0 h-full w-2 cursor-col-resize select-none z-[20] hover:bg-base-300/50"
          (mousedown)="onSelectionResizeMouseDown()($event)"
          (touchstart)="onSelectionResizeTouchStart()($event)"
          (dragstart)="onSelectionResizeDragStart()($event)"
          draggable="false"
        ></span>
      </th>
      }
      @for (h of grp.headers; track h.id) { @if (h?.isPlaceholder) {
      <th [attr.colspan]="h.colSpan"></th>
      } @else {
      <th
        (click)="toggleHeaderSort()(h, $event)"
        class="cursor-pointer select-none relative overflow-visible min-w-0 pr-0 bg-base-100"
        draggable="true"
        pcHeaderReorder
        [pcHeaderReorder]="h"
        role="columnheader"
        [attr.aria-sort]="ariaSortHeader()(h)"
        [attr.colspan]="h.colSpan"
        [class.sticky]="pinState()(h) !== false"
        [style.left.px]="pinState()(h) === 'left' ? leftOffsetPx()(h.column.id) : null"
        [style.right.px]="pinState()(h) === 'right' ? rightOffsetPx()(h.column.id) : null"
        [style.zIndex]="pinState()(h) !== false ? 20 : 40"
        [style.width.px]="getColWidth()(h.column.id) || null"
        [attr.data-col-id]="h.column.id"
      >
        <div class="flex group items-center gap-2 pr-0">
          <span class="flex-grow">{{ h.column?.columnDef?.header || h.column?.id }}</span>
          <pc-icon [name]="sortIndicatorForHeader()(h)" [size]="4"></pc-icon>
          <div tabindex="0" class=" ml-auto mr-0 dropdown dropdown-end relative z-[100]" (click)="$event.stopPropagation()">
            <label tabindex="0" class="btn btn-ghost btn-xs pointer-events-auto" title="Column options" (click)="$event.stopPropagation()">
              <pc-icon class="group-hover:visible invisible" name="ellipsis-vertical"></pc-icon>
            </label>
            <ul tabindex="0" class="dropdown-content menu bg-base-100 rounded-box font-light z-[100] w-60 p-2 mt-1 shadow right-0">
              @let col = getColDefById()(h.column.id);
              <li class="dropdown dropdown-right">
                <label tabindex="0" class="flex w-full items-center justify-between"><span>Filter</span><span class="pl-2">▸</span></label>
                <ul tabindex="0" class="dropdown-content menu bg-base-100 rounded-box z-[110] w-64 p-2 shadow transform -translate-x-2">
                  @if (col && getFilterOptionsForCol()(col)?.length) {
                    @for (opt of getFilterOptionsForCol()(col!)!; track opt) {
                    <li>
                      <label class="label cursor-pointer justify-start gap-2 px-2 py-1" (click)="$event.stopPropagation()">
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
                  } @else {
                    <li class="px-2 py-1">
                      <input
                        class="input input-bordered input-xs w-full"
                        type="text"
                        placeholder="Filter value"
                        [value]="getFilterValue()(h.column.id)"
                        (input)="onHeaderFilterInput()(h.column.id, $any($event.target).value)"
                        (click)="$event.stopPropagation()"
                      />
                    </li>
                    <li class="px-2 pt-1"><a (click)="clearHeaderFilter()(h.column.id)">Clear</a></li>
                  }
                </ul>
              </li>
              <li class="dropdown dropdown-right">
                <label tabindex="0" class="flex w-full items-center justify-between"><span>Sort</span><span class="pl-2">▸</span></label>
                <ul tabindex="0" class="dropdown-content menu bg-base-100 rounded-box z-[110] w-48 p-2 shadow transform -translate-x-2">
                  <li><a (click)="sortAsc()(h)">Sort asc</a></li>
                  <li><a (click)="sortDesc()(h)">Sort desc</a></li>
                  <li><a (click)="clearSort()(h)">Clear sort</a></li>
                </ul>
              </li>
              <li class="dropdown dropdown-right">
                <label tabindex="0" class="flex w-full items-center justify-between"><span>Stickiness</span><span class="pl-2">▸</span></label>
                <ul tabindex="0" class="dropdown-content menu bg-base-100 rounded-box z-[110] w-48 p-2 shadow transform -translate-x-2">
                  <li><a (click)="pinLeft()(h)">Pin left</a></li>
                  <li><a (click)="pinRight()(h)">Pin right</a></li>
                  <li><a (click)="unpin()(h)">Unpin</a></li>
                </ul>
              </li>
              <li class="dropdown dropdown-right">
                <label tabindex="0" class="flex w-full items-center justify-between"><span>Size</span><span class="pl-2">▸</span></label>
                <ul tabindex="0" class="dropdown-content menu bg-base-100 rounded-box z-[110] w-56 p-2 shadow transform -translate-x-2">
                  <li><a (click)="autoSizeColumn()(h)">Auto-size</a></li>
                  <li><a (click)="resetColWidth()(h)">Reset width</a></li>
                </ul>
              </li>
              <li class="dropdown dropdown-right">
                <label tabindex="0" class="flex w-full items-center justify-between"><span>Column</span><span class="pl-2">▸</span></label>
                <ul tabindex="0" class="dropdown-content menu bg-base-100 rounded-box z-[110] w-64 p-2 shadow transform -translate-x-2">
                  <li><a (click)="hideColumn()(h)">Hide</a></li>
                  <li class="dropdown dropdown-right">
                    <label tabindex="0" class="flex w-full items-center justify-between"><span>Columns</span><span class="pl-2">▸</span></label>
                    <ul tabindex="0" class="dropdown-content menu bg-base-100 rounded-box z-[120] w-64 p-2 shadow transform -translate-x-2">
                      @for (cid of hiddenColumns(); track cid) {
                      <li><a (click)="showColumnById()(cid)">Show {{ columnLabelFor()(cid) }}</a></li>
                      } @if (!hiddenColumns().length) {
                      <li class="opacity-60 px-2 py-1">None hidden</li>
                      }
                    </ul>
                  </li>
                </ul>
              </li>
            </ul>
          </div>
        </div>
        @if (i === groups().length - 1) {
        <span class="pointer-events-none absolute top-0 right-0 h-full w-px bg-base-300/80 z-[30]"></span>
        <span
          class="absolute top-0 right-0 h-full w-1 cursor-col-resize select-none z-40 hover:bg-base-300/50"
          [pcHeaderResize]="resizeCfg(h)"
          (dblclick)="autoSizeColumn()(h)"
          draggable="false"
        ></span>
        }
      </th>
      } }
    </tr>
    }
  `,
})
export class DataGridHeaderComponent {
  public allSelected = input<boolean>(false);
  public ariaSortHeader = input<(h: any) => 'ascending' | 'descending' | 'none'>((_h) => 'none');
  public autoSizeColumn = input<(h: any) => void>((_h) => {});
  public clearHeaderFilter = input<(field: string) => void>((_f) => {});
  public clearSort = input<(h: any) => void>((_h) => {});
  public columnLabelFor = input<(id: string) => string>((_id) => '');
  public enableSelection = input<boolean>(true);
  public getColDefById = input<(id: string) => ColDef | undefined>((_id) => undefined);
  public getColWidth = input<(id: string) => number | null>((_id) => null);
  public getFilterOptionsForCol = input<(col: ColDef) => string[] | null>((_c) => null);
  public getFilterValue = input<(field: string) => string>((_f) => '');
  public groups = input<any[]>([]);
  public hiddenColumns = input<string[]>([]);
  public hideColumn = input<(h: any) => void>((_h) => {});
  public isOptionChecked = input<(field: string, option: string) => boolean>((_f, _o) => false);
  public leftOffsetPx = input<(id: string) => number>((_id) => 0);
  public onHeaderCheckbox = input<(checked: boolean) => void>((_c) => {});
  public onHeaderDragOver = input<(h: any, ev: DragEvent) => void>((_h, _e) => {});
  public onHeaderDragStart = input<(h: any, ev: DragEvent) => void>((_h, _e) => {});
  public onHeaderDrop = input<(h: any, ev: DragEvent) => void>((_h, _e) => {});
  public onHeaderFilterInput = input<(field: string, value: any) => void>((_f, _v) => {});
  public onSelectionResizeDragStart = input<(ev: DragEvent) => void>((_e) => {});
  public onSelectionResizeMouseDown = input<(ev: MouseEvent) => void>((_e) => {});
  public onSelectionResizeTouchStart = input<(ev: TouchEvent) => void>((_e) => {});
  public onToggleFilterOption = input<(field: string, option: string, checked: boolean) => void>((_f, _o, _c) => {});
  public pinLeft = input<(h: any) => void>((_h) => {});
  public pinRight = input<(h: any) => void>((_h) => {});
  public pinState = input<(h: any) => 'left' | 'right' | false>((_h) => false);
  public requestPersist = input<() => void>(() => {});
  public resetColWidth = input<(h: any) => void>((_h) => {});
  public rightOffsetPx = input<(id: string) => number>((_id) => 0);
  public selectionStickyWidth = input<number>(48);
  public showColumnById = input<(id: string) => void>((_id) => {});
  public sortAsc = input<(h: any) => void>((_h) => {});
  public sortDesc = input<(h: any) => void>((_h) => {});
  public sortIndicatorForHeader = input<(h: any) => PcIconNameType>((_h) => 'none' as PcIconNameType);
  public tableAllPageSelected = input<() => boolean>(() => false);
  public tableSomePageSelected = input<() => boolean>(() => false);
  public toggleHeaderSort = input<(h: any, ev?: MouseEvent) => void>((_h, _e?) => {});
  public unpin = input<(h: any) => void>((_h) => {});

  // helpers for header resize directive config to avoid complex inline expressions
  public headerSetWidth(col: any, _id: string, w: number) {
    if (col?.setSize) col.setSize(w);
  }

  public resizeCfg(h: any) {
    return {
      header: h,
      getColWidth: this.getColWidth(),
      setWidth: this.headerSetWidth.bind(this),
      requestPersist: this.requestPersist(),
      selectionWidth: this.selectionWidthValue.bind(this),
    } as const;
  }

  public selectionWidthValue() {
    return this.selectionStickyWidth();
  }
}
