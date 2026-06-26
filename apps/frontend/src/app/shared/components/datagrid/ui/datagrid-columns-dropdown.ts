import { Component, input } from '@angular/core';

/**
 * Column visibility dropdown shared by the mobile and desktop toolbars.
 * Rendered as the projected content of a `pc-grid-tool-btn` dropdown, so it
 * uses `display: contents` to stay a direct child of the DaisyUI `<details>`.
 *
 * The grid is passed in as an input rather than injected: as projected
 * content it does not reliably resolve the same `DataGrid` instance.
 */
@Component({
  selector: 'pc-dg-columns-dropdown',
  template: `
    <ul tabindex="0" class="dropdown-content menu bg-base-100 rounded-box z-[1] w-64 p-2 shadow">
      <li class="px-2 py-1 flex gap-2">
        <button class="btn btn-ghost btn-xs" (click)="grid().showAllColsPublic()">Show all</button>
        <button class="btn btn-ghost btn-xs" (click)="grid().hideAllColsPublic()">Hide all</button>
        <button class="btn btn-ghost btn-xs" (click)="grid().resetAllWidthsPublic()">Reset widths</button>
      </li>
      @for (col of grid().getColDefsForToolbar(); track col.field) {
        @if (col.field) {
          <li>
            <label tabindex="-1" class="label cursor-pointer justify-start gap-2">
              <input
                type="checkbox"
                class="checkbox checkbox-xs"
                [checked]="grid().getColVisibilityMap()[col.field!] !== false"
                (change)="grid().toggleColPublic(col.field!, $any($event.target).checked)"
              />
              <span class="label-text">{{ col.headerName || col.field }}</span>
            </label>
          </li>
        }
      }
    </ul>
  `,
  styles: [
    `
      :host {
        display: contents;
      }
    `,
  ],
})
export class DataGridColumnsDropdownComponent {
  public readonly grid = input.required<any>();
}
