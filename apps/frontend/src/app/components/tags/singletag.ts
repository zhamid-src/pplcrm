import { Component, EventEmitter, Output, Signal, input, signal } from '@angular/core';
import { Icon } from '@uxcommon/icon';

export class TagModel {
  constructor(
    public name: string,
    public invisible = signal(false),
  ) {}
}

/**
 * The `SingleTag` component displays a single tag UI element with optional delete functionality and animation.
 *
 * ## Inputs
 * - `name`: The label or name of the tag (required).
 * - `canDelete`: Whether to show a delete icon (defaults to `true`).
 *
 * ## Outputs
 * - `clickEvent`: Emits the tag name when the tag is clicked.
 * - `closeEvent`: Emits the tag name when the tag is deleted. This should be handled by the parent to remove the tag from the array **after** a short delay to allow the CSS animation to complete.
 *
 * ## Template Notes
 * - The `destroy` flag should be bound to a CSS class to trigger the exit animation (`.destroy`).
 *
 * ## Usage
 * Used in tag lists or input interfaces to represent individual tags with interaction capabilities.
 */
@Component({
  selector: 'pc-singletag',
  imports: [Icon],
  templateUrl: './singletag.html',
})
export class SingleTag {
  public canDelete = input<boolean>(true);
  @Output() public clickEvent = new EventEmitter<string>();
  @Output() public closeEvent = new EventEmitter<string>();
  public name = input.required<string>();
  public invisible = input<Signal<boolean>>(signal(false));

  constructor() {}

  public emitClick() {
    this.clickEvent.emit(this.name());
  }

  public emitClose() {
    // Destroy here sets the animation by adding the class 'destroy' to the tag
    // It does mean that the tag should be removed from the array in the parent component
    // after some delay, so that the animation can complete
    this.closeEvent.emit(this.name());
  }
}
