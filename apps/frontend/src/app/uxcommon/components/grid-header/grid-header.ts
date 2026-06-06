import { Component, input } from '@angular/core';

@Component({
  selector: 'pc-grid-header',
  template: `
    <div class="flex justify-between items-center bg-base-100 p-6 rounded-2xl shadow-sm border border-base-200">
      <div>
        <h1 class="text-2xl font-bold tracking-tight">{{ title() }}</h1>
        <p class="text-sm text-base-content/60 mt-1">
          {{ description() }}
        </p>
      </div>
      <ng-content></ng-content>
    </div>
  `,
})
export class GridHeaderComponent {
  public readonly title = input.required<string>();
  public readonly description = input.required<string>();
}
