import { Injectable, signal, effect } from '@angular/core';
import { DataGridColumnsService } from '../services/columns.service';

@Injectable({ providedIn: 'root' })
export class PinningController {
  private headerWidthMap = new Map<string, number>();
  readonly pinnedLeftOffsets = signal<Record<string, number>>({});
  readonly pinnedRightOffsets = signal<Record<string, number>>({});
  private tsTable: any = null;
  private headerWidthVer = signal(0);
  private pinStateVer = signal(0);
  private initialized = false;
  private getColWidth: ((id: string) => number | null) | null = null;
  private getSelectionWidth: (() => number) | null = null;
  private getPinState: (() => { left: string[]; right: string[] }) | null = null;

  constructor(private readonly columnsSvc: DataGridColumnsService) {
    // Create effect within injection context
    effect(() => {
      // Touch versions/signals to create dependencies
      void this.headerWidthVer();
      void this.pinStateVer();
      if (!this.initialized || !this.getSelectionWidth || !this.getColWidth || !this.getPinState) return;
      const sel = this.getSelectionWidth();
      const pin = this.getPinState();
      const { left, right } = this.columnsSvc.computePinOffsets({
        pinned: { left: pin.left || [], right: pin.right || [] },
        getColWidth: (id) => (this.getColWidth ? this.getColWidth(id) : null),
        headerWidthMap: this.headerWidthMap,
        selectionStickyWidth: sel,
      });
      this.pinnedLeftOffsets.set(left);
      this.pinnedRightOffsets.set(right);
    });
  }

  attachTable(tsTable: any) {
    this.tsTable = tsTable;
  }

  init(opts: {
    getColWidth: (id: string) => number | null;
    getSelectionWidth: () => number;
    getPinState: () => { left: string[]; right: string[] };
  }) {
    if (this.initialized) return;
    this.initialized = true;
    this.getColWidth = opts.getColWidth;
    this.getSelectionWidth = opts.getSelectionWidth;
    this.getPinState = opts.getPinState;
    // Kick the effect now that getters are set
    this.notifyPinStateChanged();
  }

  notifyPinStateChanged() {
    this.pinStateVer.update((x) => x + 1);
  }

  measureHeaderWidths(table: HTMLTableElement): { selectionWidth: number | null; headerMap: Map<string, number> } {
    const measured = this.columnsSvc.measureHeaderWidths(table);
    this.headerWidthMap = measured.headerMap;
    this.headerWidthVer.update((x) => x + 1);
    return { selectionWidth: measured.selectionWidth, headerMap: measured.headerMap };
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
