import { Component, input, output } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { Icon } from '@icons/icon';
import { PcIconNameType } from '@icons/icons.index';

@Component({
  selector: 'pc-swap',
  imports: [ReactiveFormsModule, Icon],
  template: `<label
    class="swap ml-auto flex-none cursor-pointer p-2"
    [class.swap-flip]="animation() === 'flip'"
    [class.swap-rotate]="animation() === 'rotate'"
    [class.swap-active]="checked()"
    (click)="emitClick($event)"
  >
    <pc-icon [name]="swapOnIcon()!" class="swap-on" [size]="size()" />

    <pc-icon [name]="swapOffIcon()!" [hover]="hoverIcon()" class="swap-off" [size]="size()" />
  </label> `,
})
export class Swap {
  public readonly click = output<void>();

  public animation = input<'flip' | 'rotate'>('rotate');

  public checked = input<boolean>(false);
  public hoverIcon = input<PcIconNameType | null>(null);
  public size = input(6);

  public swapOffIcon = input.required<PcIconNameType>();

  public swapOnIcon = input.required<PcIconNameType>();

  public emitClick(event: Event) {
    event.stopPropagation();
    this.click.emit();
  }
}
