import { Component, EventEmitter, Output, input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IconName } from './icons';
import { IconsComponent } from './icons.component';

@Component({
  selector: 'pc-swap',
  imports: [FormsModule, IconsComponent],
  templateUrl: './swap.html',
})
export class Swap {
  public animation = input<'flip' | 'rotate'>('rotate');
  public checked = input<boolean>(false);
  @Output() public clickEvent = new EventEmitter();
  public swapOffIcon = input.required<IconName>();
  public swapOnIcon = input.required<IconName>();

  public emitClick() {
    this.clickEvent.emit();
  }
}
