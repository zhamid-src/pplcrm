import { Injectable } from '@angular/core';

export type PinState = 'left' | 'right' | false;

@Injectable({ providedIn: 'root' })
export class DataGridColumnsService {
  measureHeaderWidths(table: HTMLTableElement): {
    selectionWidth: number | null;
    headerMap: Map<string, number>;
  } {
    const map = new Map<string, number>();
    let selectionWidth: number | null = null;
    const sel = table.querySelector('thead th.selection-col') as HTMLElement | null;
    if (sel) {
      const srect = sel.getBoundingClientRect();
      if (srect.width > 0) selectionWidth = Math.round(srect.width);
    }
    const nodes = table.querySelectorAll('thead th[data-col-id]');
    nodes.forEach((el) => {
      const id = (el as HTMLElement).getAttribute('data-col-id') || '';
      if (!id) return;
      const rect = (el as HTMLElement).getBoundingClientRect();
      if (rect.width > 0) map.set(id, rect.width);
    });
    return { selectionWidth, headerMap: map };
  }

  computePinOffsets(args: {
    pinned: { left: string[]; right: string[] };
    getColWidth: (id: string) => number | null;
    headerWidthMap: Map<string, number>;
    selectionStickyWidth: number;
  }): { left: Record<string, number>; right: Record<string, number> } {
    const left: Record<string, number> = {};
    let acc = args.selectionStickyWidth;
    for (const id of args.pinned.left || []) {
      const w = args.getColWidth(id) || args.headerWidthMap.get(id) || 0;
      left[id] = acc;
      acc += w;
    }
    const right: Record<string, number> = {};
    let racc = 0;
    for (let i = (args.pinned.right || []).length - 1; i >= 0; i--) {
      const id = args.pinned.right[i];
      const w = args.getColWidth(id) || args.headerWidthMap.get(id) || 0;
      right[id] = racc;
      racc += w;
    }
    return { left, right };
  }

  computeAutoSizeWidth(table: HTMLTableElement, id: string): number {
    let max = 0;
    const head = table.querySelector(`thead th[data-col-id="${id}"]`) as HTMLElement | null;
    if (head) max = Math.max(max, head.scrollWidth + 16);
    const cells = table.querySelectorAll(`tbody td[data-col-id="${id}"]`);
    cells.forEach((el) => {
      const w = (el as HTMLElement).scrollWidth + 16;
      if (w > max) max = w;
    });
    return Math.max(0, max);
  }
}

