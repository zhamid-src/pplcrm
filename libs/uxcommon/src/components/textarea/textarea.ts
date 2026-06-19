import { Component, input } from '@angular/core';
import { FormField } from '@angular/forms/signals';

@Component({
  selector: 'pc-textarea',
  imports: [FormField],
  template: `
    <div class="flex flex-col gap-1 w-full">
      @if (label()) {
        <label class="label py-0 pl-1">
          <span class="label-text text-xs font-semibold text-base-content/70">{{ label() }}</span>
        </label>
      }

      <textarea
        [placeholder]="placeholder()"
        [formField]="formField()"
        [rows]="rows()"
        class="textarea textarea-bordered w-full"
        [class.textarea-error]="formField()().invalid() && (formField()().dirty() || formField()().touched())"
      ></textarea>

      @if (formField()().invalid() && (formField()().dirty() || formField()().touched())) {
        @for (err of formField()().errors(); track err) {
          <p class="text-[11px] text-error pl-1">{{ err.message }}</p>
        }
      }
    </div>
  `,
})
export class Textarea {
  public label = input<string>();
  public placeholder = input<string>('');
  public rows = input<number>(3);
  public formField = input.required<any>();
}
