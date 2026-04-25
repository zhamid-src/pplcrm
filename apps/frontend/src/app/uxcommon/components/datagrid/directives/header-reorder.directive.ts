import { Directive, inject, input } from '@angular/core';
import { DataGrid } from '../datagrid';

@Directive({
  selector: '[pcHeaderReorder]',
  host: {
    '(dragstart)': 'onDragStart($event)',
    '(dragover)': 'onDragOver($event)',
    '(drop)': 'onDrop($event)',
  },
})
export class HeaderReorderDirective {
  public readonly header = input<any>(undefined, { alias: 'pcHeaderReorder' });

  private readonly grid: any = inject(DataGrid);

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
