import { Directive, HostBinding, Input } from '@angular/core';

@Directive({
  selector: '[pcStickyPin]',
  standalone: true,
})
export class StickyPinDirective {
  @Input('pcStickyState') state: 'left' | 'right' | false = false;
  @Input('pcStickyLeft') left = 0;
  @Input('pcStickyRight') right = 0;
  @Input('pcStickyZ') z = 0;
  @Input('pcStickyBg') bg = true;

  @HostBinding('class.sticky') get stickyClass() {
    return this.state !== false;
  }
  @HostBinding('style.left.px') get leftPx() {
    return this.state === 'left' ? this.left : null;
  }
  @HostBinding('style.right.px') get rightPx() {
    return this.state === 'right' ? this.right : null;
  }
  @HostBinding('style.zIndex') get zIndex() {
    return this.state !== false ? this.z || 10 : null;
  }
  @HostBinding('style.background') get background() {
    return this.bg && this.state !== false ? 'var(--fallback-b1,oklch(var(--b1)))' : null;
  }
}
