import { Component, input, output } from '@angular/core';

/**
 * Desktop filter dropdown shell shared by the tags/issues/list toolbar
 * dropdowns: a `dropdown-content` panel with a title and an optional
 * "Clear Filter" action, with the actual filter control projected in.
 *
 * Rendered as the projected content of a `pc-grid-tool-btn`, so it uses
 * `display: contents` to stay a direct child of the DaisyUI `<details>`.
 */
@Component({
  selector: 'pc-dg-filter-dropdown',
  template: `
    <div
      tabindex="0"
      class="dropdown-content bg-base-100 rounded-box w-72 p-3 shadow-lg border border-base-200 flex flex-col items-stretch text-left gap-2"
    >
      <div class="font-semibold text-xs flex justify-between items-center text-base-content/80 px-1">
        <span>{{ title() }}</span>
        @if (active()) {
          <button
            i18n
            class="btn btn-ghost btn-xs text-primary p-0 h-auto min-h-0 no-underline hover:underline text-[11px]"
            (click)="clear.emit()"
          >
            Clear Filter
          </button>
        }
      </div>
      <ng-content></ng-content>
    </div>
  `,
  styles: [
    `
      :host {
        display: contents;
      }
    `,
  ],
})
export class DataGridFilterDropdownComponent {
  public title = input.required<string>();
  public active = input(false);
  public clear = output<void>();
}
