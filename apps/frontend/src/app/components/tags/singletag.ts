import { Component, EventEmitter, Output, input } from '@angular/core';
import { IconsComponent } from '@uxcommon/icons.component';

@Component({
  selector: 'pc-singletag',
  imports: [IconsComponent],
  templateUrl: './singletag.html',
})
export class SingleTag {
  public allowDetele = input<boolean>(true);
  public animate = input<boolean>(true);
  @Output() public clickEvent = new EventEmitter<string>();
  @Output() public closeEvent = new EventEmitter<string>();
  public name = input.required<string>();

  protected destroy = false;

  public emitClick() {
    this.clickEvent.emit(this.name());
  }

  public emitClose() {
    // Destroy here sets the animation by adding the class 'destroy' to the tag
    // It does mean that the tag should be removed from the array in the parent component
    // after some delay, so that the animation can complete
    this.destroy = true;
    this.closeEvent.emit(this.name());
  }
}
