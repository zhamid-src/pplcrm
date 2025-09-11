import { Injectable, effect, signal } from '@angular/core';
import { GridStoreService } from '../services/grid-store.service';
import { Virtualizer, elementScroll, observeElementOffset, observeElementRect } from '@tanstack/virtual-core';

@Injectable({ providedIn: 'root' })
export class VirtualizerController {
  private virtualizer: Virtualizer<HTMLDivElement, Element> | undefined;
  private scrollerEl: HTMLDivElement | null = null;
  private rowHeight = 36;
  private fetchingNext = false;
  private canNextFn: (() => boolean) | null = null;
  private isLoadingFn: (() => boolean) | null = null;
  private nextPageFn: (() => Promise<void>) | null = null;
  private tsTable: any = null;

  // Local viewport tracking used for fallback calculations
  readonly viewportH = signal(0);

  constructor(private readonly store: GridStoreService) {
    // Keep virtualizer count in sync with rows length
    effect(() => {
      const count = this.store.rows().length;
      if (this.virtualizer) this.virtualizer.setOptions({ ...this.virtualizer.options, count });
    });
  }

  attach(scroller: HTMLDivElement, rowHeight: number) {
    this.scrollerEl = scroller;
    this.rowHeight = rowHeight;
    this.viewportH.set(scroller.clientHeight || 0);
    this.virtualizer = new Virtualizer<HTMLDivElement, Element>({
      count: this.store.rows().length,
      getScrollElement: () => scroller,
      estimateSize: () => this.rowHeight,
      overscan: 6,
      scrollToFn: elementScroll,
      observeElementRect,
      observeElementOffset,
    });
  }

  attachTable(tsTable: any) {
    this.tsTable = tsTable;
  }

  configurePaging(opts: { canNext: () => boolean; isLoading: () => boolean; nextPage: () => Promise<void> }) {
    this.canNextFn = opts.canNext;
    this.isLoadingFn = opts.isLoading;
    this.nextPageFn = opts.nextPage;
  }

  detach() {
    this.virtualizer = undefined;
    this.scrollerEl = null;
    this.tsTable = null;
  }

  onScroll(event: Event) {
    const el = event.target as HTMLElement;
    this.viewportH.set(el.clientHeight || this.viewportH());
    this.virtualizer?.scrollToOffset?.(el.scrollTop || 0);
    // Infinite append: when near bottom, fetch next page if available
    try {
      if (this.canNextFn && this.isLoadingFn && this.nextPageFn) {
        if (this.canNextFn() && !this.isLoadingFn() && !this.fetchingNext) {
          const nearBottom = this.endIndex() > this.store.rows().length - 10;
          if (nearBottom) {
            this.fetchingNext = true;
            this.nextPageFn().finally(() => (this.fetchingNext = false));
          }
        }
      }
    } catch {}
  }

  startIndex(): number {
    const items = this.virtualizer?.getVirtualItems() ?? [];
    if (items.length) return items[0].index;
    // Fallback before virtualizer initializes
    const sc = this.scrollerEl;
    const top = sc?.scrollTop || 0;
    return Math.max(0, Math.floor(top / this.rowHeight));
  }

  endIndex(): number {
    const items = this.virtualizer?.getVirtualItems() ?? [];
    if (items.length) return items[items.length - 1].index + 1;
    return Math.min(this.store.rows().length, this.startIndex() + this.visibleCount());
  }

  topPadHeight(): number {
    const v = this.virtualizer;
    if (v) {
      const items = v.getVirtualItems();
      if (items.length) return items[0].start;
    }
    return this.startIndex() * this.rowHeight;
  }

  bottomPadHeight(): number {
    const v = this.virtualizer;
    if (v) {
      const items = v.getVirtualItems();
      const total = v.getTotalSize();
      const renderedEnd = items.length ? items[items.length - 1].end : 0;
      return Math.max(0, total - renderedEnd);
    }
    const total = this.store.rows().length * this.rowHeight;
    const rendered = this.topPadHeight() + (this.endIndex() - this.startIndex()) * this.rowHeight;
    return Math.max(0, total - rendered);
  }

  visibleTableRows(): any[] {
    const all = this.tsTable?.getRowModel?.().rows || [];
    const start = this.startIndex();
    const end = this.endIndex();
    return all.slice(start, end);
  }

  visibleCount(): number {
    const items = this.virtualizer?.getVirtualItems() ?? [];
    if (items.length) return items.length;
    const vp = this.viewportH() || 0;
    return Math.max(1, Math.ceil(vp / this.rowHeight) + 6);
  }
}

