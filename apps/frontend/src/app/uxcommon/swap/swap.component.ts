import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IconName, IconsComponent } from '../icons/icons.component';

@Component({
  selector: 'pc-swap',
  standalone: true,
  imports: [CommonModule, FormsModule, IconsComponent],
  templateUrl: './swap.component.html',
  styleUrl: './swap.component.scss',
})
export class SwapComponent {
  @Input() public animation: 'flip' | 'rotate' = 'rotate';
  @Input() public checked: boolean = false;
  @Output() public clickEvent = new EventEmitter();
  @Input({ required: true }) public swapOffIcon: IconName | undefined;
  @Input({ required: true }) public swapOnIcon: IconName | undefined;

  public emitClick() {
    this.clickEvent.emit();
  }
}
