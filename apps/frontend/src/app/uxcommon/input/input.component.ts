import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormGroup, FormGroupDirective, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { IconName } from '@uxcommon/icons/icons';
import { IconsComponent } from '@uxcommon/icons/icons.component';

@Component({
  selector: 'pc-input',
  standalone: true,
  imports: [CommonModule, IconsComponent, FormsModule, ReactiveFormsModule],
  templateUrl: './input.component.html',
  styleUrl: './input.component.scss',
})
export class InputComponent implements OnInit {
  @Input() type: string = 'name';
  @Input() placeholder: string = '';
  @Input({ required: true }) control!: string;
  @Input() icon: IconName | null = null;
  @Input() pattern: string | RegExp = '';

  @Output() keyup = new EventEmitter<string>();

  protected form!: FormGroup;
  protected inputValue: string = '';

  constructor(private rootFormGroup: FormGroupDirective) {}
  ngOnInit() {
    this.form = this.rootFormGroup.control;
  }
  handleKeyup() {
    this.keyup?.emit(this.inputValue);
  }
}
