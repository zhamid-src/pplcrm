import { Component, input } from '@angular/core';
import { Icon } from '@icons/icon';
import { PcIconNameType } from '@icons/icons.index';

/**
 * The one empty-state idiom (design §3): icon + sentence naming the cause +
 * ONE projected action button. Never italic grey placeholder text.
 *
 * `bordered` (default) draws the dashed full-surface container; turn it off
 * when the surrounding surface (a table cell, a card body) already frames it.
 */
@Component({
  selector: 'pc-empty-state',
  imports: [Icon],
  template: `
    <div
      class="flex flex-col items-center gap-3 py-16 text-center"
      [class.rounded-xl]="bordered()"
      [class.border]="bordered()"
      [class.border-dashed]="bordered()"
      [class.border-base-300]="bordered()"
    >
      <pc-icon [name]="icon()" [size]="8" class="opacity-30" />
      <span class="text-base font-medium">{{ title() }}</span>
      @if (hint(); as h) {
        <span class="text-sm opacity-70">{{ h }}</span>
      }
      <ng-content />
    </div>
  `,
})
export class EmptyState {
  public readonly bordered = input<boolean>(true);
  public readonly hint = input<string>();
  public readonly icon = input.required<PcIconNameType>();
  public readonly title = input.required<string>();
}
