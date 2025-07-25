import { Component, EventEmitter, OnInit, Output, inject, input } from "@angular/core";
import { FormGroup, FormGroupDirective, ReactiveFormsModule } from "@angular/forms";
import { AlertService } from "@uxcommon/alert-service";
import { IconName } from "@uxcommon/svg-icons-list";

import { debounceTime, distinctUntilChanged } from "rxjs";

@Component({
  selector: 'pc-form-input',
  imports: [ReactiveFormsModule],
  template: './formInput.html',
})
export class FormInput implements OnInit {
  private alertSvc = inject(AlertService);
  private rootFormGroup = inject(FormGroupDirective);

  /**
   * The parent form group this input belongs to.
   */
  protected form!: FormGroup;

  /**
   * Local cache of the current input value.
   */
  protected inputValue: string = '';

  /**
   * The name of the FormControl inside the parent FormGroup.
   */
  public control = input.required<string>();

  /**
   * The debounce time (in milliseconds) applied to value changes.
   * Defaults to 300ms.
   */
  public debounceTime = input<number>(300);

  /**
   * A list of characters to disallow in the input.
   * If any are typed, they'll be removed and an alert will show.
   */
  public disallowedChars = input<string[]>([]);

  /**
   * An optional icon to display inside the input field.
   */
  public icon = input<IconName | null>(null);

  /**
   * Emits when the input loses focus.
   * Sends the key, current value, and a boolean indicating if it changed.
   */
  @Output()
  public lostFocus = new EventEmitter<{ key: string; value: string; changed: boolean }>();

  /**
   * Optional regex pattern that the input must match.
   */
  public pattern = input<string | RegExp>('.*');

  /**
   * Placeholder text for the input.
   */
  public placeholder = input<string>('');

  /**
   * The input type (e.g. 'text', 'email', 'number', etc.).
   */
  public type = input<string>('text');

  /**
   * Emits the updated value (debounced and sanitized).
   */
  @Output()
  public valueChange = new EventEmitter<string>();

  /**
   * Initialize the component by connecting it to the parent form group
   * and subscribing to value changes.
   */
  public ngOnInit() {
    this.form = this.rootFormGroup.control;
    this.form
      .get(this.control())
      ?.valueChanges.pipe(debounceTime(this.debounceTime()), distinctUntilChanged())
      .subscribe((value) => this.handleInputChange(value));
  }

  /**
   * Gets the current value of the FormControl.
   */
  protected getControlValue() {
    return this.form.get(this.control())?.value;
  }

  /**
   * Called when the input loses focus.
   * Emits the current value and whether it was changed.
   */
  protected handleBlur() {
    const value = this.getControlValue() || '';
    const changed = this.form.get(this.control())?.dirty || false;
    this.lostFocus.emit({ key: this.control(), value, changed });
  }

  /**
   * Validates the last added character to ensure it's allowed.
   * If not, shows an alert and removes disallowed characters.
   *
   * @param value - The updated input string
   * @returns Sanitized value with disallowed characters removed
   */
  private checkLastAddedChar(value: string): string {
    const newValue = value && this.removeDisallowedChars(value);
    if (newValue !== value) {
      this.alertSvc.showError(`Sorry, you cannot use these character(s): ${this.disallowedChars().join(', ')}`);
      this.form.get(this.control())?.setValue(newValue);
    }
    return newValue;
  }

  /**
   * Escapes special characters in a string for use in a regular expression.
   */
  private escapeRegExp(char: string): string {
    return char.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Handles value changes in the input by sanitizing and emitting the new value.
   *
   * @param value - The updated value from the input
   */
  private handleInputChange(value: string) {
    const newValue = this.checkLastAddedChar(value);
    this.valueChange?.emit(newValue);
  }

  /**
   * Removes all disallowed characters from the input.
   *
   * @param value - The value to clean
   * @returns Cleaned string with disallowed characters removed
   */
  private removeDisallowedChars(value: string): string {
    const regex = new RegExp(this.disallowedChars().map(this.escapeRegExp).join('|'), 'g');
    return value.replace(regex, '');
  }
}
