import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { IconName } from '@uxcommon/icons/icons';
import { IconsComponent } from '@uxcommon/icons/icons.component';

@Component({
  selector: 'pc-input',
  standalone: true,
  imports: [CommonModule, IconsComponent, FormsModule, ReactiveFormsModule],
  templateUrl: './input.component.html',
  styleUrl: './input.component.scss',
})
export class InputComponent {
  @Input() public icon: IconName | null = null;
  @Input() public placeholder: string = '';
  @Input() public type: string = 'text';
  @Output() public valueChange = new EventEmitter<string>();

  protected inputValue: string = '';

  constructor() {}

  public handleKeyup() {
    this.valueChange?.emit(this.inputValue);
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public handleChange() {
    this.inputValue = '';
  }
}
