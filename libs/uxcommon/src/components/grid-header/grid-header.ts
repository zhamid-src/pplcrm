import { Component, input } from '@angular/core';

@Component({
  selector: 'pc-grid-header',
  template: `
    <details class="collapse collapse-arrow bg-base-100 border border-base-200 shadow-xs">
      <summary
        class="collapse-title px-4 pt-4 pb-2 m-0 cursor-pointer after:justify-self-center text-xl font-bold tracking-tight"
      >
        {{ title() }}
      </summary>

      <div class="collapse-content border-t border-base-200 px-4 pt-2 text-sm text-base-content/60 mt-1">
        {{ description() }}
      </div>
    </details>
  `,
})
export class GridHeaderComponent {
  public readonly title = input.required<string>();
  public readonly description = input.required<string>();
}
