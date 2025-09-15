import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Icon } from '@icons/icon';

@Component({
  selector: 'pc-dg-filter-panel',
  standalone: true,
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: 'datagrid-filter-panel.html',
})
export class DataGridFilterPanelComponent {
  public apply = output<void>();
  public changeOp = output<{ field: string; op: 'contains' | 'equals' }>();
  public changeValue = output<{ field: string; value: any }>();
  public clear = output<void>();
  public close = output<void>();
  public labelFor = input<(field: string) => string>((f) => f);
  public optionsFor = input<(field: string) => string[] | null>((_f) => null);
  public panelFields = input<string[]>([]);
  public panelFilters = input<Record<string, { op: 'contains' | 'equals'; value: any }>>({});
}
