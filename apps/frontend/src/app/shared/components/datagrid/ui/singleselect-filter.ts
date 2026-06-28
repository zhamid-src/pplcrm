import { Component, input, output } from '@angular/core';

export interface SingleSelectOption {
  value: string;
  label: string;
}

@Component({
  selector: 'pc-singleselect-filter',
  template: `
    <div class="overflow-y-auto flex flex-col gap-0.5 pr-1 email-scrollbar" [style.max-height.rem]="maxHeight()">
      @if (options().length === 0) {
        <div i18n class="px-3 py-3 text-xs text-neutral-400 text-center">No {{ label().toLowerCase() }} found</div>
      } @else {
        @for (opt of options(); track opt.value) {
          <label
            class="label cursor-pointer justify-start gap-2 py-1 px-2 rounded hover:bg-base-200 w-full min-w-0 flex items-center select-none"
          >
            <input
              type="radio"
              [name]="radioName()"
              class="radio radio-primary radio-xs shrink-0"
              [checked]="selected() === opt.value"
              (change)="select.emit(opt.value)"
            />
            <span class="label-text truncate flex-1 min-w-0 text-xs" [title]="opt.label">{{ opt.label }}</span>
          </label>
        }
      }
    </div>
  `,
})
export class SingleselectFilterComponent {
  label = input.required<string>();
  options = input.required<SingleSelectOption[]>();
  selected = input<string | null>(null);
  radioName = input.required<string>();
  maxHeight = input(9);

  select = output<string>();
}
