import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormGroup, FormGroupDirective, ReactiveFormsModule } from '@angular/forms';
import { AlertService } from '@services/alert.service';
import { IconName } from '@uxcommon/icons/icons';
import { IconsComponent } from '@uxcommon/icons/icons.component';
import { debounceTime, distinctUntilChanged } from 'rxjs';

@Component({
  selector: 'pc-form-input',
  standalone: true,
  imports: [CommonModule, IconsComponent, ReactiveFormsModule],
  templateUrl: './formInput.component.html',
  styleUrl: './formInput.component.scss',
})
export class FormInputComponent implements OnInit {
  @Input({ required: true }) public control!: string;
  @Input() public debounceTime: number = 300;
  @Input() public disallowedChars: string[] = [];
  @Input() public icon: IconName | null = null;
  @Input() public pattern: string | RegExp = '.*';
  @Input() public placeholder: string = '';
  @Input() public type: string = 'text';

  @Output() public valueChange = new EventEmitter<string>();
  @Output() public lostFocus = new EventEmitter<{ key: string; value: string; changed: boolean }>();

  protected form!: FormGroup;
  protected inputValue: string = '';

  constructor(
    private rootFormGroup: FormGroupDirective,
    private alertSvc: AlertService,
  ) {}

  public ngOnInit() {
    this.form = this.rootFormGroup.control;
    this.form
      .get(this.control)
      ?.valueChanges.pipe(debounceTime(this.debounceTime), distinctUntilChanged())
      .subscribe((value) => this.handleInputChange(value));
  }

  protected getControlValue() {
    return this.form.get(this.control)?.value;
  }

  private checkLastAddedChar(value: string): string {
    const newValue = value && this.removeDisallowedChars(value);
    if (newValue !== value) {
      this.alertSvc.showError(
        `Sorry, you cannot use these character(s): ${this.disallowedChars.join(', ')}`,
      );
      this.form.get(this.control)?.setValue(newValue);
    }
    return newValue;
  }
  protected handleBlur() {
    const value = this.getControlValue() || '';
    const changed = this.form.get(this.control)?.dirty || false;
    this.lostFocus.emit({ key: this.control, value, changed });
  }

  private escapeRegExp(char: string): string {
    // Escapes characters that have special meaning in regular expressions
    return char.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private handleInputChange(value: string) {
    // First make sure nothing is disallowed
    const newValue = this.checkLastAddedChar(value);
    this.valueChange?.emit(newValue);
  }

  private removeDisallowedChars(value: string): string {
    const regex = new RegExp(this.disallowedChars.map(this.escapeRegExp).join('|'), 'g');
    return value.replace(regex, '');
  }
}
