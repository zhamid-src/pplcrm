import { Directive, HostListener, Input, inject } from '@angular/core';
import { DataGrid } from '../datagrid';

@Directive({
  selector: '[pcHeaderResize]',
  standalone: true,
})
export class HeaderResizeDirective {
  @Input('pcHeaderResize') header: any;

  private readonly grid = inject<any>(DataGrid as any);

  @HostListener('mousedown', ['$event'])
  onMouseDown(ev: MouseEvent) {
    try {
      this.grid.onHeaderResizeMouseDown(this.header, ev);
    } catch {}
  }

  @HostListener('touchstart', ['$event'])
  onTouchStart(ev: TouchEvent) {
    try {
      this.grid.onHeaderResizeTouchStart(this.header, ev);
    } catch {}
  }

  @HostListener('dblclick', ['$event'])
  onDblClick(ev: MouseEvent) {
    try {
      this.grid.onHeaderResizeDblClick(this.header, ev);
    } catch {}
  }

  @HostListener('dragstart', ['$event'])
  onDragStart(ev: DragEvent) {
    try {
      this.grid.onHeaderResizeDragStart(ev);
    } catch {}
  }
}

