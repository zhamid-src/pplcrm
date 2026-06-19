import { Component, input, output } from '@angular/core';
import { Icon } from '@icons/icon';
import { PcIconNameType } from '@icons/icons.index';

@Component({
  selector: 'pc-detail-row',
  imports: [Icon],
  template: `
    <div
      class="flex items-center justify-between p-2 rounded-lg bg-base-200/50 hover:bg-base-200 transition-colors text-sm w-full min-w-0 gap-3"
    >
      <div class="flex items-center gap-2 overflow-hidden min-w-0">
        @if (icon()) {
          <pc-icon [name]="icon()!" [size]="4" [class]="iconClass() + ' flex-shrink-0'"></pc-icon>
        }
        <div class="truncate text-base-content min-w-0">
          <ng-content></ng-content>
        </div>
      </div>

      @if (actionIcon()) {
        <button
          class="btn btn-ghost btn-xs btn-circle text-base-content/50 hover:text-primary tooltip flex-shrink-0"
          [attr.data-tip]="actionTip()"
          (click)="onActionClick($event)"
        >
          <pc-icon [name]="actionIcon()!" [size]="4"></pc-icon>
        </button>
      } @else {
        <ng-content select="[pc-row-action]"></ng-content>
      }
    </div>
  `,
})
export class DetailRow {
  public icon = input<PcIconNameType | null | undefined>();
  public iconClass = input<string | null | undefined>('');
  public actionIcon = input<PcIconNameType | null | undefined>();
  public actionTip = input<string | null | undefined>('');

  public actionClick = output<MouseEvent>();

  protected onActionClick(event: MouseEvent): void {
    event.stopPropagation();
    event.preventDefault();
    this.actionClick.emit(event);
  }
}
