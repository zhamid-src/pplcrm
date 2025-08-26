import { Component, input, output } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { Icon } from '@icons/icon';
import { PcIconNameType } from '@icons/icons.index';

/**
 * A reusable toggle/swap component that switches between two icons.
 * Can be used for toggle buttons like play/pause, expand/collapse, etc.
 */
@Component({
  selector: 'pc-swap',
  imports: [ReactiveFormsModule, Icon],
  templateUrl: './swap.html',
})
export class Swap {
  /**
   * Event emitted when the component is clicked.
   * Use this to handle toggle logic externally.
   */
  public readonly click = output<void>();

  /**
   * The animation to apply when swapping icons.
   * Can be either 'flip' or 'rotate'.
   * @default 'rotate'
   */
  public animation = input<'flip' | 'rotate'>('rotate');

  /**
   * Indicates whether the toggle is currently checked/on.
   */
  public checked = input<boolean>(false);
  public size = input(6);

  /**
   * The icon to display when the toggle is **off**.
   */
  public swapOffIcon = input.required<PcIconNameType>();

  /**
   * The icon to display when the toggle is **on**.
   */
  public swapOnIcon = input.required<PcIconNameType>();

  /**
   * Emits the click event for the parent to handle toggle logic.
   */
  public emitClick(event: Event) {
    event.stopPropagation();
    this.click.emit();
  }
}
