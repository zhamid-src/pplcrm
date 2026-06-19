import { Component, input } from '@angular/core';
import { FormField } from '@angular/forms/signals';

@Component({
  selector: 'pc-input',
  imports: [FormField],
  template: `
    <div class="flex flex-col gap-1 w-full">
      @if (label()) {
        <label class="label py-0 pl-1">
          <span class="label-text text-xs font-semibold text-base-content/70">{{ label() }}</span>
        </label>
      }

      <label
        class="input w-full flex items-center gap-2"
        [class.input-error]="
          hasError() || (formField()().invalid() && (formField()().dirty() || formField()().touched()))
        "
      >
        <ng-content select="[pc-prefix]"></ng-content>
        <input [type]="type()" [placeholder]="placeholder()" [formField]="formField()" class="grow" />
        <ng-content select="[pc-suffix]"></ng-content>
      </label>

      @if ((hasError() || formField()().invalid()) && (formField()().dirty() || formField()().touched())) {
        @for (err of formField()().errors(); track err) {
          <p class="text-[11px] text-error pl-1">{{ err.message }}</p>
        }
      }
    </div>
  `,
})
export class Input {
  public label = input<string>();
  public type = input<string>('text');
  public placeholder = input<string>('');
  public formField = input.required<any>();
  public hasError = input<boolean>(false);
}
