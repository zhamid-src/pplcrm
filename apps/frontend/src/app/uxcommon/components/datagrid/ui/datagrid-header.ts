import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { Icon } from '@icons/icon';
import type { PcIconNameType } from '@icons/icons.index';

import { DataGrid } from '../datagrid';
import { HeaderReorderDirective } from '../directives/header-reorder.directive';
import { HeaderResizeDirective } from '../directives/header-resize.directive';
import type { ColumnDef as ColDef } from '../grid-defaults';

@Component({
  selector: 'pc-dg-header',
  standalone: true,
  imports: [Icon, HeaderReorderDirective, HeaderResizeDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: 'datagrid-header.html',
})
export class DataGridHeaderComponent {
  private readonly grid = inject<DataGrid<any, any>>(DataGrid as any, { optional: true });

  public allSelected = input<boolean>(false);
  public ariaSortHeader = input<(h: any) => 'ascending' | 'descending' | 'none'>(
    (h) => (this.grid?.ariaSortHeader(h) as any) ?? 'none',
  );
  public autoSizeColumn = input<(h: any) => void>((h) => this.grid?.autoSizeColumn(h));
  public clearHeaderFilter = input<(field: string) => void>((f) => this.grid?.clearHeaderFilter(f));
  public clearSort = input<(h: any) => void>((h) => this.grid?.clearSort(h));
  public columnLabelFor = input<(id: string) => string>((id) => this.grid?.columnLabelFor(id) ?? '');
  public enableSelection = input<boolean>(true);
  public getColDefById = input<(id: string) => ColDef | undefined>((id) => this.grid?.getColDefById(id));
  public getColWidth = input<(id: string) => number | null>((id) => this.grid?.getColWidth(id) ?? null);
  public getFilterOptionsForCol = input<(col: ColDef) => string[] | null>(
    (c) => this.grid?.getFilterOptionsForCol(c) ?? null,
  );
  public getFilterValue = input<(field: string) => string>((f) => this.grid?.getFilterValue(f) ?? '');
  public groups = input<any[]>([]);
  public hiddenColumns = input<string[]>([]);
  public hideColumn = input<(h: any) => void>((h) => this.grid?.hideColumn(h));
  public isOptionChecked = input<(field: string, option: string) => boolean>(
    (f, o) => !!this.grid?.isOptionChecked(f, o),
  );
  public leftOffsetPx = input<(id: string) => number>((id) => this.grid?.leftOffsetPx(id) ?? 0);
  public onHeaderCheckbox = input<(checked: boolean) => void>((c) => this.grid?.onHeaderCheckbox(c));
  public onHeaderDragOver = input<(h: any, ev: DragEvent) => void>((h, e) => this.grid?.onHeaderDragOver(h, e));
  public onHeaderDragStart = input<(h: any, ev: DragEvent) => void>((h, e) => this.grid?.onHeaderDragStart(h, e));
  public onHeaderDrop = input<(h: any, ev: DragEvent) => void>((h, e) => this.grid?.onHeaderDrop(h, e));
  public onHeaderFilterInput = input<(field: string, value: any) => void>(
    (f, v) => this.grid?.onHeaderFilterInput(f, v),
  );
  public onSelectionResizeDragStart = input<(ev: DragEvent) => void>((e) => this.grid?.onSelectionResizeDragStart(e));
  public onSelectionResizeMouseDown = input<(ev: MouseEvent) => void>((e) => this.grid?.onSelectionResizeMouseDown(e));
  public onSelectionResizeTouchStart = input<(ev: TouchEvent) => void>(
    (e) => this.grid?.onSelectionResizeTouchStart(e),
  );
  public onToggleFilterOption = input<(field: string, option: string, checked: boolean) => void>(
    (f, o, c) => this.grid?.onToggleFilterOption(f, o, c),
  );
  public pinLeft = input<(h: any) => void>((h) => this.grid?.pinLeft(h));
  public pinRight = input<(h: any) => void>((h) => this.grid?.pinRight(h));
  public pinState = input<(h: any) => 'left' | 'right' | false>((h) => (this.grid?.pinState(h) as any) ?? false);
  public requestPersist = input<() => void>(() => this.grid?.requestPersist());
  public resetColWidth = input<(h: any) => void>((h) => this.grid?.resetColWidth(h));
  public rightOffsetPx = input<(id: string) => number>((id) => this.grid?.rightOffsetPx(id) ?? 0);
  public selectionStickyWidth = input<number>(48);
  public showColumnById = input<(id: string) => void>((id) => this.grid?.showColumnById(id));
  public sortAsc = input<(h: any) => void>((h) => this.grid?.sortAsc(h));
  public sortDesc = input<(h: any) => void>((h) => this.grid?.sortDesc(h));
  public sortIndicatorForHeader = input<(h: any) => PcIconNameType>(
    (h) => (this.grid?.sortIndicatorForHeader(h) as any) ?? ('none' as PcIconNameType),
  );
  public tableAllPageSelected = input<() => boolean>(() => this.grid?.tableAllPageSelected() ?? false);
  public tableSomePageSelected = input<() => boolean>(() => this.grid?.tableSomePageSelected() ?? false);
  public toggleHeaderSort = input<(h: any, ev?: MouseEvent) => void>((h, e?) => this.grid?.toggleHeaderSort(h, e));
  public unpin = input<(h: any) => void>((h) => this.grid?.unpin(h));

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
