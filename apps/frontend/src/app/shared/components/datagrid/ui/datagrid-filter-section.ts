import { Component, input, output } from '@angular/core';
import { Icon } from '@icons/icon';

/**
 * Mobile collapsible filter section shared by the narrow/tags/issues/list
 * rows inside the combined mobile filter panel: a `<details>` with an active
 * dot indicator, title, optional "Clear" action, and a rotating chevron.
 * The filter control itself is projected in.
 *
 * Uses `display: contents` so the `<details>` stays a direct flex child of
 * the surrounding panel column.
 */
@Component({
  selector: 'pc-dg-filter-section',
  imports: [Icon],
  template: `
    <details class="group" [class.border-t]="bordered()" [class.border-base-200]="bordered()" [open]="open()">
      <summary
        class="flex items-center justify-between px-1 py-2 cursor-pointer list-none select-none hover:bg-base-200 rounded text-xs font-semibold text-base-content/80"
      >
        <span class="flex items-center gap-1.5">
          @if (active()) {
            <span class="inline-block w-1.5 h-1.5 rounded-full bg-primary shrink-0"></span>
          }
          {{ title() }}
        </span>
        <div class="flex items-center gap-1">
          @if (active() && clearable()) {
            <button
              i18n
              class="btn btn-ghost btn-xs text-primary p-0 h-auto min-h-0 hover:underline text-[11px]"
              (click)="clear.emit(); $event.stopPropagation()"
            >
              Clear
            </button>
          }
          <pc-icon
            name="chevron-down"
            [size]="3"
            class="transition-transform group-open:rotate-180 text-base-content/40"
          ></pc-icon>
        </div>
      </summary>
      <div class="pt-1 pb-2">
        <ng-content></ng-content>
      </div>
    </details>
  `,
  styles: [
    `
      :host {
        display: contents;
      }
    `,
  ],
})
export class DataGridFilterSectionComponent {
  public title = input.required<string>();
  public active = input(false);
  public open = input(false);
  public bordered = input(true);
  public clearable = input(true);
  public clear = output<void>();
}
