import { Directive, DestroyRef, ElementRef, HostListener, inject, input } from '@angular/core';

/**
 * Attribute directive for buttons that ensures their inner `<pc-icon>` spins
 * for **at least** `minMs` milliseconds when clicked — even if the async work
 * resolves instantly.
 *
 * ### Usage
 * ```html
 * <button pcSpinOnClick [disabled]="loading()" (click)="refresh()">
 *   <pc-icon name="arrow-path" [size]="4"></pc-icon>
 *   Refresh
 * </button>
 * ```
 *
 * No `spinning` signal or `spinAtLeastOnce` call needed in the component.
 * The icon will also keep spinning while the button remains disabled (i.e.
 * while `loading()` is true), because `animate-spin` persists until the
 * timer expires *and* the button is re-enabled.
 */
@Directive({
  selector: 'button[pcSpinOnClick]',
  exportAs: 'pcSpinOnClick',
})
export class SpinOnClickDirective {
  private readonly el = inject(ElementRef<HTMLButtonElement>);
  private readonly destroyRef = inject(DestroyRef);

  /** Minimum spin duration in milliseconds. Default: 700ms ≈ one full revolution. */
  readonly minMs = input(700);

  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.destroyRef.onDestroy(() => this.clearTimer());
  }

  @HostListener('click')
  protected onButtonClick(): void {
    const icon = this.el.nativeElement.querySelector('pc-icon') as HTMLElement | null;
    if (!icon) return;

    icon.classList.add('animate-spin', 'inline-block');
    this.clearTimer();

    this.timer = setTimeout(() => {
      icon.classList.remove('animate-spin', 'inline-block');
      this.timer = null;
    }, this.minMs());
  }

  private clearTimer(): void {
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }
}
