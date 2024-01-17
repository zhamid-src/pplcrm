import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormGroup, FormGroupDirective, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { IconName } from '@uxcommon/icons/icons';
import { IconsComponent } from '@uxcommon/icons/icons.component';

@Component({
  selector: 'pc-form-input',
  standalone: true,
  imports: [CommonModule, IconsComponent, FormsModule, ReactiveFormsModule],
  templateUrl: './formInput.component.html',
  styleUrl: './formInput.component.scss',
})
export class FormInputComponent implements OnInit {
  @Input({ required: true }) public control!: string;
  @Input() public icon: IconName | null = null;
  @Input() public pattern: string | RegExp = '.*';
  @Input() public placeholder: string = '';
  @Input() public type: string = 'text';
  @Output() public valueChange = new EventEmitter<string>();

  protected form!: FormGroup;
  protected inputValue: string = '';

  constructor(private rootFormGroup: FormGroupDirective) {}

  public ngOnInit() {
    this.form = this.rootFormGroup.control;
  }

  public handleKeyup() {
    this.valueChange?.emit(this.inputValue);
  }
}
