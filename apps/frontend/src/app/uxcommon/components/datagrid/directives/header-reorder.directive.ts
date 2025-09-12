import { Directive, HostListener, Input, inject } from '@angular/core';
import { DataGrid } from '../datagrid';

@Directive({
  selector: '[pcHeaderReorder]',
  standalone: true,
})
export class HeaderReorderDirective {
  @Input('pcHeaderReorder') header: any;

  private readonly grid = inject<any>(DataGrid as any);

  @HostListener('dragstart', ['$event'])
  onDragStart(ev: DragEvent) {
    try {
      this.grid.onHeaderDragStart(this.header, ev);
    } catch {}
  }

  @HostListener('dragover', ['$event'])
  onDragOver(ev: DragEvent) {
    try {
      this.grid.onHeaderDragOver(this.header, ev);
    } catch {}
  }

  @HostListener('drop', ['$event'])
  onDrop(ev: DragEvent) {
    try {
      this.grid.onHeaderDrop(this.header, ev);
    } catch {}
  }
}

