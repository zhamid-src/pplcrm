
import { Component, input } from '@angular/core';
import { BypassHtmlSanitizerPipe } from '@pipes/svg-html.pipe';
import { IconName, icons } from './icons';

@Component({
    selector: 'pc-icon',
    imports: [BypassHtmlSanitizerPipe],
    templateUrl: './icons.component.html',
    styleUrl: './icons.component.css'
})
export class IconsComponent {
  public name = input.required<IconName>();
  public size = input<number>(6);

  public getSvg() {
    return icons[this.name()];
  }
}
