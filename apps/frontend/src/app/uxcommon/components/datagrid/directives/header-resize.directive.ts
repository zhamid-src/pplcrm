import { Directive, HostListener, Input, inject } from '@angular/core';
import { ResizingController } from '../controllers/resizing.controller';
import { PinningController } from '../controllers/pinning.controller';
import type { HeaderRef } from '../types';

@Directive({
  selector: '[pcHeaderResize]',
  standalone: true,
})
export class HeaderResizeDirective {
  private readonly resizing = inject(ResizingController);
  private readonly pinning = inject(PinningController);

  @Input({ required: true }) pcHeaderResize!: {
    header: HeaderRef; // TanStack header ref
    getColWidth: (id: string) => number | null;
    setWidth: (col: any, id: string, px: number) => void;
    requestPersist: () => void;
    selectionWidth: () => number;
  };

  @HostListener('mousedown', ['$event'])
  onMouseDown(ev: MouseEvent) {
    ev.stopPropagation();
    const h = this.pcHeaderResize.header;
    this.resizing.beginHeaderResize(
      h,
      ev.clientX,
      this.pcHeaderResize.getColWidth,
      (col, id, w) => {
        this.pcHeaderResize.setWidth(col, id, w);
        this.pinning.updatePinOffsets(
          h?.table,
          (cid) => this.pcHeaderResize.getColWidth(cid) ?? 0,
          this.pcHeaderResize.selectionWidth()
        );
      },
      this.pcHeaderResize.requestPersist,
    );
  }

  @HostListener('touchstart', ['$event'])
  onTouchStart(ev: TouchEvent) {
    ev.stopPropagation();
    const x = ev.touches?.[0]?.clientX ?? 0;
    const h = this.pcHeaderResize.header;
    this.resizing.beginHeaderResizeTouch(
      h,
      x,
      this.pcHeaderResize.getColWidth,
      (col, id, w) => {
        this.pcHeaderResize.setWidth(col, id, w);
        this.pinning.updatePinOffsets(
          h?.table,
          (cid) => this.pcHeaderResize.getColWidth(cid) ?? 0,
          this.pcHeaderResize.selectionWidth()
        );
      },
      this.pcHeaderResize.requestPersist,
    );
  }

  @HostListener('dragstart', ['$event'])
  onDragStart(ev: DragEvent) {
    ev.preventDefault();
    ev.stopPropagation();
  }
}
