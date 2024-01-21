import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormGroup, FormGroupDirective, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { AlertService } from '@services/alert.service';
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
  @Input() public disallowedChars: string[] = [];
  @Input() public type: string = 'text';
  @Output() public valueChange = new EventEmitter<string>();

  protected form!: FormGroup;
  protected inputValue: string = '';

  constructor(
    private rootFormGroup: FormGroupDirective,
    private alertSvc: AlertService,
  ) {}

  public ngOnInit() {
    this.form = this.rootFormGroup.control;
  }

  protected getControlValue() {
    return this.form.get(this.control)?.value;
  }

  protected handleKeyup(event: KeyboardEvent) {
    // First make sure nothing is disallowed
    if (this.checkLastAddedChar(event?.key)) {
      return;
    }
    this.valueChange?.emit(this.getControlValue());
  }

  private checkLastAddedChar(char: string): boolean {
    if (char && this.disallowedChars.find((ch) => ch == char)) {
      this.alertSvc.showError(`Sorry, cannot add "${char}" here.`);
      const newStr = this.getControlValue();
      newStr && this.form.get(this.control)?.setValue(newStr.slice(0, -1));
      return true;
    }
    return false;
  }
}
