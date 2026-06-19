import { Component, input } from '@angular/core';
import { FormField } from '@angular/forms/signals';

@Component({
  selector: 'pc-select',
  imports: [FormField],
  template: `
    <div class="flex flex-col gap-1 w-full">
      @if (label()) {
        <label class="label py-0 pl-1">
          <span class="label-text text-xs font-semibold text-base-content/70">{{ label() }}</span>
        </label>
      }

      <select
        [formField]="formField()"
        class="select select-bordered w-full"
        [class.select-error]="formField()().invalid() && (formField()().dirty() || formField()().touched())"
      >
        @if (placeholder()) {
          <option value="">{{ placeholder() }}</option>
        }
        <ng-content></ng-content>
      </select>

      @if (formField()().invalid() && (formField()().dirty() || formField()().touched())) {
        @for (err of formField()().errors(); track err) {
          <p class="text-[11px] text-error pl-1">{{ err.message }}</p>
        }
      }
    </div>
  `,
})
export class Select {
  public label = input<string>();
  public placeholder = input<string>('');
  public formField = input.required<any>();
}
