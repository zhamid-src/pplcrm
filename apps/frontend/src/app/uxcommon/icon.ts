import { Component, input } from '@angular/core';

import { IconName, icons } from './svg-icons-list';
import { BypassHtmlSanitizerPipe } from 'apps/frontend/src/app/svg-html-pipe';

@Component({
  selector: 'pc-icon',
  imports: [BypassHtmlSanitizerPipe],
  template: ` <div [innerHTML]="getSvg() | bypassHtmlSanitizer" class="h-{{ size() }} w-{{ size() }}"></div> `,
})
export class Icon {
  /**
   * The name of the icon to render.
   * Must be one of the keys defined in the `icons` map.
   */
  public name = input.required<IconName>();

  /**
   * The Tailwind size for the icon, used for both height and width.
   * Default is 6 (i.e., `h-6 w-6`).
   */
  public size = input<number>(6);

  /**
   * Retrieves the SVG string for the given icon name.
   * The SVG will be rendered as raw HTML using the bypassHtmlSanitizer pipe.
   *
   * @returns The raw SVG string for the icon.
   */
  public getSvg() {
    return icons[this.name()];
  }
}
