import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'tr[pc-dg-row]',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: ''
})
export class DataGridRowComponent {
  row = input<any>();
  enableSelection = input<boolean>(true);
  selectionStickyWidth = input<number>(48);
  allSelected = input<boolean>(false);
  allSelectedIdSet = input<Set<string>>(new Set());
  toId = input<(row: any) => string>((r) => String(r?.id ?? ''));
  onRowCheckboxChange = input<(row: any, checked: boolean) => void>((_r, _c) => undefined);
  onMouseOverRow = input<(row: any) => void>((_r) => undefined);
}
