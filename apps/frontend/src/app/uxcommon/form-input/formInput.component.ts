
import { Component, EventEmitter, OnInit, Output, input } from '@angular/core';
import { FormGroup, FormGroupDirective, ReactiveFormsModule } from '@angular/forms';
import { AlertService } from '@services/alert.service';
import { IconName } from '@uxcommon/icons/icons';
import { IconsComponent } from '@uxcommon/icons/icons.component';
import { debounceTime, distinctUntilChanged } from 'rxjs';

@Component({
    selector: 'pc-form-input',
    imports: [IconsComponent, ReactiveFormsModule],
    templateUrl: './formInput.component.html',
    styleUrl: './formInput.component.scss'
})
export class FormInputComponent implements OnInit {
  public control = input.required<string>();
  public debounceTime = input<number>(300);
  public disallowedChars = input<string[]>([]);
  public icon = input<IconName | null>(null);
  @Output() public lostFocus = new EventEmitter<{ key: string; value: string; changed: boolean }>();
  public pattern = input<string | RegExp>('.*');
  public placeholder = input<string>('');
  public type = input<string>('text');
  @Output() public valueChange = new EventEmitter<string>();

  protected form!: FormGroup;
  protected inputValue: string = '';

  constructor(
    private rootFormGroup: FormGroupDirective,
    private alertSvc: AlertService,
  ) {}

  public ngOnInit() {
    this.form = this.rootFormGroup.control;
    this.form
      .get(this.control())
      ?.valueChanges.pipe(debounceTime(this.debounceTime()), distinctUntilChanged())
      .subscribe((value) => this.handleInputChange(value));
  }

  protected getControlValue() {
    return this.form.get(this.control())?.value;
  }

  protected handleBlur() {
    const value = this.getControlValue() || '';
    const changed = this.form.get(this.control())?.dirty || false;
    this.lostFocus.emit({ key: this.control(), value, changed });
  }

  private checkLastAddedChar(value: string): string {
    const newValue = value && this.removeDisallowedChars(value);
    if (newValue !== value) {
      this.alertSvc.showError(
        `Sorry, you cannot use these character(s): ${this.disallowedChars().join(', ')}`,
      );
      this.form.get(this.control())?.setValue(newValue);
    }
    return newValue;
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
    const regex = new RegExp(this.disallowedChars().map(this.escapeRegExp).join('|'), 'g');
    return value.replace(regex, '');
  }
}
