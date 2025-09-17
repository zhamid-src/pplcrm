import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';

import { DataGrid } from '../datagrid';
import type { ColumnDef as ColDef } from '../grid-defaults';

@Component({
  selector: 'pc-dg-inline-filters-row',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: 'datagrid-inline-filters-row.html',
})
export class DataGridInlineFiltersRowComponent {
  private readonly grid: any = inject(DataGrid, { optional: true });

  public clearHeaderFilter = input<(field: string) => void>((f) => this.grid?.clearHeaderFilter(f));
  public enableSelection = input<boolean>(true);
  public getColDefById = input<(id: string) => ColDef | undefined>((id) => this.grid?.getColDefById(id));
  public getFilterOptionsForCol = input<(col: ColDef) => string[] | null>(
    (c) => this.grid?.getFilterOptionsForCol(c) ?? null,
  );
  public getFilterValue = input<(field: string) => string>((f) => this.grid?.getFilterValue(f) ?? '');
  public inlineFilterLabel = input<(field: string) => string>((f) => this.grid?.inlineFilterLabel?.(f) ?? '');
  public isOptionChecked = input<(field: string, option: string) => boolean>(
    (f, o) => !!this.grid?.isOptionChecked(f, o),
  );
  public leafHeaders = input<any[]>([]);
  public leftOffsetPx = input.required<(colId: string) => number>();
  public onHeaderFilterInput = input<(field: string, value: any) => void>(
    (f, v) => this.grid?.onHeaderFilterInput(f, v),
  );
  public onToggleFilterOption = input<(field: string, option: string, checked: boolean) => void>(
    (f, o, c) => this.grid?.onToggleFilterOption(f, o, c),
  );
  public pinState = input.required<(h: any) => 'left' | 'right' | false>();
  public rightOffsetPx = input.required<(colId: string) => number>();
  public selectionStickyWidth = input<number>(48);
}
