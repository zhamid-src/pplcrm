import { Directive, inject, input } from '@angular/core';
import type { Header } from '@tanstack/table-core';
import { DataGrid } from '../datagrid';
import type { GridRow } from '../types';

@Directive({
  selector: '[pcHeaderReorder]',
  host: {
    '(dragstart)': 'onDragStart($event)',
    '(dragover)': 'onDragOver($event)',
    '(drop)': 'onDrop($event)',
  },
})
export class HeaderReorderDirective {
  public readonly header = input<Header<GridRow, unknown> | undefined>(undefined, { alias: 'pcHeaderReorder' });

  private readonly grid = inject(DataGrid);

  protected onDragStart(ev: DragEvent) {
    try {
      this.grid.onHeaderDragStart(this.header(), ev);
    } catch {}
  }

  protected onDragOver(ev: DragEvent) {
    try {
      this.grid.onHeaderDragOver(this.header(), ev);
    } catch {}
  }

  protected onDrop(ev: DragEvent) {
    try {
      this.grid.onHeaderDrop(this.header(), ev);
    } catch {}
  }
}
