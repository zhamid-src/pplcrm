import { Directive, input } from '@angular/core';

@Directive({
  selector: '[pcStickyPin]',
  host: {
    '[class.sticky]': 'state() !== false',
    '[style.left.px]': 'state() === "left" ? left() : null',
    '[style.right.px]': 'state() === "right" ? right() : null',
    '[style.zIndex]': 'state() !== false ? z() || 10 : null',
    '[style.background]': 'bg() && state() !== false ? "var(--fallback-b1,oklch(var(--b1)))" : null',
  },
})
export class StickyPinDirective {
  public readonly state = input<'left' | 'right' | false>(false, { alias: 'pcStickyState' });
  public readonly left = input(0, { alias: 'pcStickyLeft' });
  public readonly right = input(0, { alias: 'pcStickyRight' });
  public readonly z = input(0, { alias: 'pcStickyZ' });
  public readonly bg = input(true, { alias: 'pcStickyBg' });
}
