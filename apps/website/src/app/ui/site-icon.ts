import { Component, computed, input } from '@angular/core';

/**
 * A single-color icon rendered by masking one of the shared SVGs
 * (apps/frontend/src/assets/icons, copied to /assets/icons at build time —
 * see project.json). The glyph takes `currentColor`, so callers colour it with
 * a normal text utility (e.g. `text-primary`, `text-secondary`, `text-white`).
 *
 * `name` is the icon file's base name (e.g. "users" -> assets/icons/users.svg).
 */
@Component({
  selector: 'pc-site-icon',
  template: `<span
    class="inline-block bg-current align-middle"
    aria-hidden="true"
    [style.width.px]="px()"
    [style.height.px]="px()"
    [style.-webkit-mask]="mask()"
    [style.mask]="mask()"
  ></span>`,
})
export class SiteIcon {
  public readonly name = input.required<string>();
  /** Square edge length in px. */
  public readonly size = input<number>(20);

  protected readonly px = computed<number>(() => this.size());
  protected readonly mask = computed<string>(() => `url('assets/icons/${this.name()}.svg') center / contain no-repeat`);
}
