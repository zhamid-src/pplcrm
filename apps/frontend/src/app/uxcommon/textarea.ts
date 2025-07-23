import { Component, EventEmitter, OnInit, Output, inject, input } from '@angular/core';
import { FormGroup, FormGroupDirective, FormsModule, ReactiveFormsModule } from '@angular/forms';

/**
 * A textarea form control component that integrates with Angular Reactive Forms.
 * Emits value changes on keyup for real-time updates.
 */
@Component({
  selector: 'pc-textarea',
  imports: [ReactiveFormsModule, FormsModule],
  templateUrl: './textarea.html',
})
export class TextArea implements OnInit {
  private rootFormGroup = inject(FormGroupDirective);

  /**
   * The form group retrieved from the parent using `FormGroupDirective`.
   */
  protected form!: FormGroup;

  /**
   * The name of the form control in the parent form group.
   */
  public control = input.required<string>();

  /**
   * Whether the textarea should be disabled.
   * @default false
   */
  public disabled = input<boolean>(false);

  /**
   * Placeholder text to display when the textarea is empty.
   */
  public placeholder = input<string>('');

  /**
   * Emits the current value of the textarea when the user types.
   */
  @Output() public valueChange = new EventEmitter<string>();

  /**
   * Initializes the form group from the parent context.
   */
  public ngOnInit() {
    this.form = this.rootFormGroup.control;
  }

  /**
   * Gets the current value of the control.
   */
  protected getControlValue() {
    return this.form.get(this.control())?.value;
  }

  /**
   * Handles the `keyup` event to emit value changes.
   */
  protected handleKeyup() {
    this.valueChange?.emit(this.getControlValue());
  }
}
