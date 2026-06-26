import { Component, input, model, output } from '@angular/core';

@Component({
  selector: 'pc-multiselect-filter',
  template: `
    <div class="flex flex-col gap-1">
      <input
        type="text"
        [placeholder]="'Search ' + label().toLowerCase() + '...'"
        class="input input-bordered input-xs w-full bg-base-100"
        [value]="searchQuery()"
        (input)="searchQuery.set($any($event.target).value)"
      />
      <div class="flex gap-2 text-[11px] text-primary px-1">
        <button class="hover:underline cursor-pointer font-medium" (click)="selectAll.emit()">Select all</button>
        <span class="text-base-300">|</span>
        <button class="hover:underline cursor-pointer font-medium" (click)="clearVisible.emit()">Clear</button>
      </div>
      <div class="border-t border-base-200 my-0.5"></div>
      <div class="overflow-y-auto flex flex-col gap-0.5 pr-1 email-scrollbar" [style.max-height.rem]="maxHeight()">
        @if (options().length === 0) {
          <div class="px-3 py-3 text-xs text-neutral-400 text-center">No {{ label().toLowerCase() }} found</div>
        } @else {
          @for (opt of options(); track opt) {
            <label
              class="label cursor-pointer justify-start gap-2 py-1 px-2 hover:bg-base-200 rounded w-full min-w-0 flex items-center select-none"
            >
              <input
                type="checkbox"
                class="checkbox checkbox-primary checkbox-xs shrink-0"
                [checked]="selected().includes(opt)"
                (change)="toggle.emit({ value: opt, checked: $any($event.target).checked })"
              />
              <span class="label-text truncate flex-1 min-w-0 text-xs" [title]="opt">{{ opt }}</span>
            </label>
          }
        }
      </div>
    </div>
  `,
})
export class MultiselectFilterComponent {
  label = input.required<string>();
  options = input.required<string[]>();
  selected = input.required<string[]>();
  searchQuery = model.required<string>();
  maxHeight = input(9);

  selectAll = output<void>();
  clearVisible = output<void>();
  toggle = output<{ value: string; checked: boolean }>();
}
