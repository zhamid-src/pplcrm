import { Component, EventEmitter, Output, input } from '@angular/core';
import { Icon } from '@icons/icon';
import { IconName } from '@icons/icons.index';

@Component({
  selector: 'pc-grid-action',
  standalone: true,
  template: `
    <li
      class="tooltip-accent"
      [class.tooltip]="enabled()"
      [class.disabled]="!enabled()"
      [class.cursor-not-allowed]="!enabled()"
      [class.text-neutral-400]="!enabled()"
      [attr.data-tip]="tip()"
      (click)="enabled() && emitClick()"
    >
      <a><pc-icon [name]="icon()"></pc-icon></a>
    </li>
  `,
  imports: [Icon],
})
export class GridActionComponent {
  @Output() public action = new EventEmitter();
  public enabled = input(true);
  public icon = input.required<IconName>();
  public tip = input.required<string>();

  public emitClick() {
    this.action.emit();
  }
}
