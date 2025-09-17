import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class KeyboardController {
  handleCellKeydown(
    ev: KeyboardEvent,
    helpers: {
      getColDefById: (id: string) => any | undefined;
      isEditable: (col: any) => boolean;
      startEdit: (row: any, col: any) => void;
      rows: () => any[];
    },
  ) {
    const td = (ev.target as HTMLElement).closest('td') as HTMLElement | null;
    if (!td) return;
    const tr = td.parentElement as HTMLElement | null;
    if (!tr) return;
    const colId = td.getAttribute('data-col-id') || '';
    if (!colId) return;
    const key = ev.key;
    if (key === 'Enter') {
      ev.preventDefault();
      const rowId = tr.getAttribute('data-row-id') || '';
      if (!rowId) return;
      const col = helpers.getColDefById(colId);
      if (!col) return;
      const row = helpers.rows().find((r: any) => String(r?.id) === rowId);
      if (!row) return;
      if (helpers.isEditable(col)) helpers.startEdit(row, col);
      return;
    }
    if (key !== 'ArrowDown' && key !== 'ArrowUp' && key !== 'ArrowLeft' && key !== 'ArrowRight') return;
    ev.preventDefault();
    if (key === 'ArrowDown' || key === 'ArrowUp') {
      const dir = key === 'ArrowDown' ? 1 : -1;
      let rowEl: HTMLElement | null = tr;
      while (rowEl) {
        rowEl = dir > 0 ? (rowEl.nextElementSibling as HTMLElement | null) : (rowEl.previousElementSibling as HTMLElement | null);
        if (!rowEl) break;
        const nextTd = rowEl.querySelector(`td[data-col-id="${colId}"]`) as HTMLElement | null;
        if (nextTd) {
          nextTd.focus({ preventScroll: false });
          break;
        }
      }
    } else {
      const cells = Array.from(tr.querySelectorAll('td')) as HTMLElement[];
      const idx = cells.findIndex((c) => c === td);
      const nextIdx = key === 'ArrowRight' ? idx + 1 : idx - 1;
      const nextTd = cells[nextIdx];
      if (nextTd) nextTd.focus({ preventScroll: false });
    }
  }
}
