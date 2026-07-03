import { Component, input } from '@angular/core';
import type { GridRow } from '../types';

@Component({
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'tr[pc-dg-row]',
  template: '',
})
export class DataGridRowComponent {
  row = input<GridRow>();
  enableSelection = input<boolean>(true);
  selectionStickyWidth = input<number>(48);
  allSelected = input<boolean>(false);
  allSelectedIdSet = input<Set<string>>(new Set());
  toId = input<(row: GridRow) => string>((r) => String(r?.['id'] ?? ''));
  onRowCheckboxChange = input<(row: GridRow, checked: boolean) => void>((_r, _c) => undefined);
  onMouseOverRow = input<(row: GridRow) => void>((_r) => undefined);
}
