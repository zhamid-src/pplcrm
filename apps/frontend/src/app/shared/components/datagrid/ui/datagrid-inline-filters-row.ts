import { Component, computed, inject, input } from '@angular/core';
import type { Header } from '@tanstack/table-core';

import { DataGrid } from '../datagrid';
import type { ColumnDef as ColDef } from '../grid-defaults';
import type { GridRow } from '../types';
import type { Models } from '../../../../../../../libs/common/src/lib/kysely.models';

@Component({
  selector: 'pc-dg-inline-filters-row',
  templateUrl: 'datagrid-inline-filters-row.html',
})
export class DataGridInlineFiltersRowComponent {
  private readonly grid: DataGrid<keyof Models, unknown> | null = inject(DataGrid, { optional: true });

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
  public leafHeaders = input<Header<GridRow, unknown>[]>([]);
  public leftOffsetPx = input.required<(colId: string) => number>();
  public onHeaderFilterInput = input<(field: string, value: unknown) => void>((f, v) =>
    this.grid?.onHeaderFilterInput(f, v),
  );
  public onToggleFilterOption = input<(field: string, option: string, checked: boolean) => void>((f, o, c) =>
    this.grid?.onToggleFilterOption(f, o, c),
  );
  public pinState = input.required<(h: Header<GridRow, unknown>) => 'left' | 'right' | false>();
  public rightOffsetPx = input.required<(colId: string) => number>();
  public selectionStickyWidth = input<number>(48);

  public readonly colWidths = computed<Record<string, number>>(() => this.grid?.colWidths?.() ?? {});
}
