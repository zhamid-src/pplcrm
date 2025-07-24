import { Component, EventEmitter, Output, input } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';

import { Icon } from './icon';
import { IconName } from './svg-icons-list';

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
   * The animation to apply when swapping icons.
   * Can be either 'flip' or 'rotate'.
   * @default 'rotate'
   */
  public animation = input<'flip' | 'rotate'>('rotate');

  /**
   * Indicates whether the toggle is currently checked/on.
   */
  public checked = input<boolean>(false);

  /**
   * Event emitted when the component is clicked.
   * Use this to handle toggle logic externally.
   */
  @Output() public clickEvent = new EventEmitter();

  /**
   * The icon to display when the toggle is **off**.
   */
  public swapOffIcon = input.required<IconName>();

  /**
   * The icon to display when the toggle is **on**.
   */
  public swapOnIcon = input.required<IconName>();

  /**
   * Emits the click event for the parent to handle toggle logic.
   */
  public emitClick() {
    this.clickEvent.emit();
  }
}
