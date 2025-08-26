import { Component, OnInit, inject, input, output } from '@angular/core';
import { FormGroup, FormGroupDirective, ReactiveFormsModule } from '@angular/forms';
import { debounce } from '@common';
import { Icon } from '@icons/icon';
import { PcIconNameType } from '@icons/icons.index';
import { AlertService } from '@uxcommon/alerts/alert-service';

@Component({
  selector: 'pc-form-input',
  imports: [ReactiveFormsModule, Icon],
  templateUrl: './formInput.html',
})
export class FormInput implements OnInit {
  private readonly alertSvc = inject(AlertService);
  private readonly rootFormGroup = inject(FormGroupDirective);

  private emitChange!: (value: string) => void;

  /**
   * Initialize the component by connecting it to the parent form group
   * and subscribing to value changes.
   */
  private lastValue = '';

  /**
   * The parent form group this input belongs to.
   */
  protected form!: FormGroup;

  /**
   * Local cache of the current input value.
   */
  protected inputValue = '';

  /**
   * Emits when the input loses focus.
   * Sends the key, current value, and a boolean indicating if it changed.
   */
  public readonly lostFocus = output<{ key: string; value: string; changed: boolean }>();

  /**
   * Emits the updated value (debounced and sanitized).
   */
  public readonly valueChange = output<string>();

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
  public icon = input<PcIconNameType | null>(null);

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

  public ngOnInit() {
    this.form = this.rootFormGroup.control;
    this.emitChange = debounce((value: string) => {
      if (value !== this.lastValue) {
        this.lastValue = value;
        this.handleInputChange(value);
      }
    }, this.debounceTime());

    this.form.get(this.control())?.valueChanges.subscribe((value: string) => {
      this.emitChange(value);
    });
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
