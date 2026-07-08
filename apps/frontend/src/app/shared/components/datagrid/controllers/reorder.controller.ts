import { Injectable } from '@angular/core';
import type { Header, Table } from '@tanstack/table-core';
import type { GridRow } from '../types';

@Injectable()
export class ReorderController {
  private dragColId: string | null = null;
  private suppressHeaderDrag: () => boolean = () => false;
  private requestPersist: () => void = () => undefined;

  configure(opts: { suppressHeaderDrag: () => boolean; requestPersist: () => void }) {
    this.suppressHeaderDrag = opts.suppressHeaderDrag;
    this.requestPersist = opts.requestPersist;
  }

  onDragOver(ev: DragEvent) {
    ev.preventDefault();
    try {
      ev.dataTransfer!.dropEffect = 'move';
    } catch {}
  }

  onDragStart(h: Header<GridRow, unknown>, ev: DragEvent) {
    if (this.suppressHeaderDrag()) {
      try {
        ev.preventDefault();
      } catch {}
      ev.stopPropagation();
      return;
    }
    const id = String(h?.column?.id || '');
    this.dragColId = id;
    try {
      ev.dataTransfer?.setData('text/plain', id);
      ev.dataTransfer!.effectAllowed = 'move';
    } catch {}
  }

  onDrop(h: Header<GridRow, unknown>, ev: DragEvent, tsTable: Table<GridRow> | undefined) {
    ev.preventDefault();
    const src = ev.dataTransfer?.getData('text/plain') || this.dragColId;
    const tgt = String(h?.column?.id || '');
    if (!src || !tgt || src === tgt) return;
    const leaves = tsTable?.getAllLeafColumns?.() || [];
    const order: string[] = leaves.map((c) => String(c.id));
    const from = order.indexOf(String(src));
    const to = order.indexOf(String(tgt));
    if (from < 0 || to < 0) return;
    order.splice(to, 0, ...order.splice(from, 1));
    tsTable?.setOptions?.((prev) => ({ ...prev, state: { ...prev.state, columnOrder: order } }));
    this.requestPersist();
  }
}
