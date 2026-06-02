import { Component, input, output } from '@angular/core';
import { Icon } from '@icons/icon';
import { PcIconNameType } from '@icons/icons.index';

@Component({
  selector: 'pc-grid-action',
  template: `
    <li
      class="tooltip tooltip-accent"
      [class.tooltip-left]="placement() === 'left'"
      [class.tooltip-right]="placement() === 'right'"
      [class.tooltip-top]="placement() === 'top'"
      [class.tooltip-bottom]="placement() === 'bottom'"
      [class.hidden]="hidden()"
      [class.disabled]="!enabled()"
      [class.cursor-not-allowed]="!enabled()"
      [class.text-neutral-400]="!enabled()"
      [class.text-primary]="active()"
      [attr.data-tip]="tip()"
      (click)="enabled() && emitClick()"
    >
      <a><pc-icon [name]="icon()"></pc-icon></a>
    </li>
  `,
  imports: [Icon],
})
export class GridActionComponent {
  public readonly action = output<void>();

  public enabled = input(true);
  public hidden = input(false);
  public active = input(false);
  public icon = input.required<PcIconNameType>();
  public tip = input.required<string>();
  public placement = input<'top' | 'bottom' | 'left' | 'right'>('bottom');

  public emitClick() {
    this.action.emit();
  }
}
