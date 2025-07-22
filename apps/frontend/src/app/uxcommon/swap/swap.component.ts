import { Component, EventEmitter, Output, input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IconName } from '../icons/icons';
import { IconsComponent } from '../icons/icons.component';

@Component({
  selector: 'pc-swap',
  imports: [FormsModule, IconsComponent],
  templateUrl: './swap.component.html',
  styleUrl: './swap.component.css',
})
export class SwapComponent {
  public animation = input<'flip' | 'rotate'>('rotate');
  public checked = input<boolean>(false);
  @Output() public clickEvent = new EventEmitter();
  public swapOffIcon = input.required<IconName>();
  public swapOnIcon = input.required<IconName>();

  public emitClick() {
    this.clickEvent.emit();
  }
}
