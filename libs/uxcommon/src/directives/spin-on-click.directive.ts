import { Directive, DestroyRef, ElementRef, HostListener, inject, input } from '@angular/core';

@Directive({
  selector: 'button[pcSpinOnClick]',
  exportAs: 'pcSpinOnClick',
})
export class SpinOnClickDirective {
  private readonly el = inject(ElementRef<HTMLButtonElement>);
  private readonly destroyRef = inject(DestroyRef);

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
