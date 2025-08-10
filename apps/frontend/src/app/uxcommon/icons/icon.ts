import { Component, ElementRef, OnInit, input } from '@angular/core';

import { IconService } from './icon.service';
import { ICONS, IconName } from './icons.index';

@Component({
  selector: 'pc-icon',
  imports: [],
  template: '',
})
export class Icon implements OnInit {
  public class = input<string>('');

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

  constructor(
    private iconSvc: IconService,
    private el: ElementRef,
  ) {}

  /**
   * Retrieves the SVG string for the given icon name.
   * The SVG will be rendered as raw HTML using the bypassHtmlSanitizer pipe.
   *
   * @returns The raw SVG string for the icon.
   */
  public getSvg() {
    return ICONS[this.name()];
  }

  public async ngOnInit() {
    const svg = await this.iconSvc.getIcon(this.name());
    this.el.nativeElement.innerHTML = svg;

    if (this.class) {
      const svgEl = this.el.nativeElement.querySelector('svg');
      if (svgEl) svgEl.setAttribute('class', this.class);
    }
  }
}
