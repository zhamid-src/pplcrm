import { Component, input, output } from '@angular/core';
import { Icon } from '@icons/icon';
import { PcIconNameType } from '@icons/icons.index';

@Component({
  selector: 'pc-grid-tool-btn',
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
      [class.dropdown]="hasDropdown()"
      [class.dropdown-end]="dropdownEnd()"
      [attr.data-tip]="tip()"
      (click)="enabled() && !hasDropdown() && emitClick()"
    >
      @if (hasDropdown()) {
        <a tabindex="0" role="button" class="relative">
          <pc-icon [name]="icon()"></pc-icon>
          @if (badge() && badge()! > 0) {
            <span class="badge badge-primary badge-xs absolute -top-0.5 -right-0.5 scale-75">
              {{ badge() }}
            </span>
          }
        </a>
        <ng-content></ng-content>
      } @else {
        <a><pc-icon [name]="icon()"></pc-icon></a>
      }
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
  public hasDropdown = input(false);
  public dropdownEnd = input(true);
  public badge = input<number | undefined>(undefined);

  public emitClick() {
    this.action.emit();
  }
}
