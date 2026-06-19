import { Component, input } from '@angular/core';
import { FormField } from '@angular/forms/signals';

@Component({
  selector: 'pc-toggle',
  imports: [FormField],
  template: `
    <div class="flex flex-col gap-1 w-full">
      <label class="label cursor-pointer justify-between gap-4 py-1">
        @if (label()) {
          <span class="label-text text-sm font-medium text-base-content">{{ label() }}</span>
        }
        <input
          type="checkbox"
          class="toggle toggle-primary shrink-0"
          [formField]="formField()"
          [class.toggle-error]="formField()().invalid() && (formField()().dirty() || formField()().touched())"
        />
      </label>

      @if (formField()().invalid() && (formField()().dirty() || formField()().touched())) {
        @for (err of formField()().errors(); track err) {
          <p class="text-[11px] text-error pl-1">{{ err.message }}</p>
        }
      }
    </div>
  `,
})
export class Toggle {
  public label = input<string>();
  public formField = input.required<any>();
}
