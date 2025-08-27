import { Component, OnInit, inject, input, output } from '@angular/core';
import { FormGroup, FormGroupDirective, ReactiveFormsModule } from '@angular/forms';

/**
 * A textarea form control component that integrates with Angular Reactive Forms.
 * Emits value changes on keyup for real-time updates.
 */
@Component({
  selector: 'pc-textarea',
  imports: [ReactiveFormsModule],
  template: `<div class="relative w-full min-w-[200px]" [formGroup]="form">
    <textarea
      [formControlName]="control()"
      [class.border-t-transparent]="getControlValue()?.length > 0"
      class="peer w-full h-full bg-transparent text-sm px-3 py-2.5 rounded-[7px] focus:outline-0 focus:border-primary focus:border-2 focus:border-t-transparent invalid:border-error invalid:border-t-transparent disabled:bg-base-300 disabled:cursor-not-allowed transition-all placeholder-shown:border placeholder-shown:border-blue-gray-200 border"
      placeholder=" "
    ></textarea>
    <label
      class="flex w-full h-full select-none pointer-events-none absolute left-0 font-normal !overflow-visible truncate leading-tight transition-all -top-1.5 text-[11px] before:content[' '] before:block before:box-border before:w-2.5 before:h-1.5 before:mt-[6.5px] before:mr-1 before:rounded-tl-md before:border-t before:border-l before:pointer-events-none before:transition-all after:content[' '] after:block after:flex-grow after:box-border after:w-2.5 after:h-1.5 after:mt-[6.5px] after:ml-1 after:rounded-tr-md after:border-t after:border-r after:pointer-events-none after:transition-all text-gray-400 peer-invalid:text-error before:border-blue-gray-200 before:peer-invalid:border-error after:border-blue-gray-200 after:peer-invalid:border-error peer-disabled:after:border-transparent peer-disabled:before:border-transparent peer-focus:leading-tight peer-focus:text-primary peer-focus:text-[11px] peer-focus:pl-0 peer-focus:before:border-t-2 peer-focus:before:!border-primary peer-focus:before:border-l-2 peer-focus:after:border-t-2 peer-focus:after:border-r-2 peer-focus:after:!border-primary peer-placeholder-shown:text-sm peer-placeholder-shown:before:border-transparent peer-placeholder-shown:after:border-transparent peer-placeholder-shown:leading-[3.75] pl-0"
    >
      {{ placeholder() }}
    </label>
  </div> `,
})
export class TextArea implements OnInit {
  private readonly rootFormGroup = inject(FormGroupDirective);

  /**
   * The form group retrieved from the parent using `FormGroupDirective`.
   */
  protected form!: FormGroup;

  /**
   * Emits the current value of the textarea when the user types.
   */
  public readonly valueChange = output<string>();

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
