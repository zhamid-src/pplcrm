import { Component, input } from '@angular/core';
import { BypassHtmlSanitizerPipe } from 'apps/frontend/src/app/svg-html-pipe';
import { IconName, icons } from './icons';

@Component({
  selector: 'pc-icon',
  imports: [BypassHtmlSanitizerPipe],
  template: ` <div [innerHTML]="getSvg() | bypassHtmlSanitizer" class="h-{{ size() }} w-{{ size() }}"></div> `,
})
export class IconsComponent {
  public name = input.required<IconName>();
  public size = input<number>(6);

  public getSvg() {
    return icons[this.name()];
  }
}
