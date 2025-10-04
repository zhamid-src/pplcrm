import { Directive, ElementRef, HostListener, Input, inject } from '@angular/core';
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
  private readonly host = inject(ElementRef) as ElementRef<HTMLElement>;

  @Input({ required: true }) pcHeaderResize!: {
    header: HeaderRef; // TanStack header ref
    getColWidth: (id: string) => number | null;
    setWidth: (col: any, id: string, px: number) => void;
    requestPersist: () => void;
    selectionWidth: () => number;
    setSuppressHeaderDrag: (v: boolean) => void;
  };

  @HostListener('mousedown', ['$event'])
  onMouseDown(ev: MouseEvent) {
    ev.stopPropagation();
    if (ev.detail > 1) return; // let double-click handler manage autosize
    const h = this.pcHeaderResize.header;
    // prevent column drag while resizing
    try { this.pcHeaderResize.setSuppressHeaderDrag(true); } catch {}
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
      () => {
        try { this.pcHeaderResize.requestPersist(); } catch {}
        try { this.pcHeaderResize.setSuppressHeaderDrag(false); } catch {}
      },
    );
  }

  @HostListener('touchstart', ['$event'])
  onTouchStart(ev: TouchEvent) {
    ev.stopPropagation();
    const x = ev.touches?.[0]?.clientX ?? 0;
    const h = this.pcHeaderResize.header;
    try { this.pcHeaderResize.setSuppressHeaderDrag(true); } catch {}
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
      () => {
        try { this.pcHeaderResize.requestPersist(); } catch {}
        try { this.pcHeaderResize.setSuppressHeaderDrag(false); } catch {}
      },
    );
  }

  @HostListener('dragstart', ['$event'])
  onDragStart(ev: DragEvent) {
    ev.preventDefault();
    ev.stopPropagation();
  }

  @HostListener('dblclick', ['$event'])
  onDoubleClick(ev: MouseEvent) {
    ev.preventDefault();
    ev.stopPropagation();
    const width = this.measureHeaderAutoWidth();
    if (width == null) return;
    this.applyWidth(Math.max(40, Math.round(width)));
  }

  private applyWidth(nextWidth: number) {
    const header = this.pcHeaderResize.header;
    const col = header?.column as { id?: string; setSize?: (value: number) => void } | undefined;
    const id = col?.id == null ? '' : String(col.id);
    if (!id || !col) return;

    this.pcHeaderResize.setWidth(col, id, nextWidth);
    this.pinning.updatePinOffsets(
      header?.table,
      (cid) => this.pcHeaderResize.getColWidth(cid) ?? 0,
      this.pcHeaderResize.selectionWidth(),
    );
    try { this.pcHeaderResize.requestPersist(); } catch {}
  }

  private measureHeaderAutoWidth(): number | null {
    const headerEl = this.host.nativeElement.closest('th');
    if (!headerEl) return null;

    const doc = headerEl.ownerDocument;
    const content = headerEl.querySelector<HTMLElement>('[data-header-content]');
    if (!content) return null;

    const clone = content.cloneNode(true) as HTMLElement;
    clone.style.position = 'absolute';
    clone.style.visibility = 'hidden';
    clone.style.pointerEvents = 'none';
    clone.style.flex = '0 0 auto';
    clone.style.width = 'auto';
    clone.style.height = 'auto';
    clone.style.maxWidth = 'unset';
    clone.style.whiteSpace = 'nowrap';
    clone.style.left = '-9999px';
    clone.style.top = '0';

    const labelClone = clone.querySelector<HTMLElement>('[data-header-label]');
    if (labelClone) {
      labelClone.style.flex = '0 0 auto';
      labelClone.style.whiteSpace = 'nowrap';
    }

    doc.body.appendChild(clone);
    const contentWidth = clone.getBoundingClientRect().width;
    clone.remove();
    if (contentWidth <= 0) return null;

    const view = doc.defaultView;
    const style = view ? view.getComputedStyle(headerEl) : null;
    const paddingLeft = style ? parseFloat(style.paddingLeft || '0') : 0;
    const paddingRight = style ? parseFloat(style.paddingRight || '0') : 0;
    const borderLeft = style ? parseFloat(style.borderLeftWidth || '0') : 0;
    const borderRight = style ? parseFloat(style.borderRightWidth || '0') : 0;

    // add a small buffer so content does not feel cramped next to the resizer
    const buffer = 8;

    return contentWidth + paddingLeft + paddingRight + borderLeft + borderRight + buffer;
  }
}
