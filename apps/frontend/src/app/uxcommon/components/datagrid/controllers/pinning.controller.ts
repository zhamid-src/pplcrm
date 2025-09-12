import { Injectable, signal } from '@angular/core';
import { DataGridColumnsService } from '../services/columns.service';

@Injectable({ providedIn: 'root' })
export class PinningController {
  private headerWidthMap = new Map<string, number>();
  readonly pinnedLeftOffsets = signal<Record<string, number>>({});
  readonly pinnedRightOffsets = signal<Record<string, number>>({});
  private tsTable: any = null;

  constructor(private readonly columnsSvc: DataGridColumnsService) {}

  attachTable(tsTable: any) {
    this.tsTable = tsTable;
  }

  measureHeaderWidths(table: HTMLTableElement): { selectionWidth: number | null } {
    const measured = this.columnsSvc.measureHeaderWidths(table);
    this.headerWidthMap = measured.headerMap;
    return { selectionWidth: measured.selectionWidth };
  }

  updatePinOffsets(tsTable: any, getColWidth: (id: string) => number | null, selectionStickyWidth: number) {
    const table = tsTable ?? this.tsTable;
    const pin = table?.getState?.().columnPinning || { left: [], right: [] };
    const { left, right } = this.columnsSvc.computePinOffsets({
      pinned: { left: Array.isArray(pin.left) ? pin.left : [], right: Array.isArray(pin.right) ? pin.right : [] },
      getColWidth,
      headerWidthMap: this.headerWidthMap,
      selectionStickyWidth,
    });
    this.pinnedLeftOffsets.set(left);
    this.pinnedRightOffsets.set(right);
  }

  leftOffsetPx(id: string): number {
    return this.pinnedLeftOffsets()[id] || 0;
  }
  rightOffsetPx(id: string): number {
    return this.pinnedRightOffsets()[id] || 0;
  }
}
