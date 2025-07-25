import {
  Directive,
  EmbeddedViewRef,
  Input,
  TemplateRef,
  ViewContainerRef,
  OnDestroy,
  effect,
  Signal,
  inject,
} from '@angular/core';

@Directive({
  selector: '[pcAnimateIf]',
  standalone: true,
})
export class AnimateIfDirective implements OnDestroy {
  private readonly vcr = inject(ViewContainerRef);
  private readonly template = inject(TemplateRef<any>);
  private view: EmbeddedViewRef<any> | null = null;
  private timeoutId: NodeJS.Timeout | undefined;

  private _condition = false;
  private _animationDuration = 300;
  private _enterClass = 'animate-left';
  private _exitClass = 'animate-exit-right';

  private conditionSignal?: Signal<boolean>;

  constructor() {
    effect(() => {
      if (this.conditionSignal) {
        this.toggle(this.conditionSignal());
      }
    });
  }

  @Input()
  set pcAnimateIf(condition: Signal<boolean>) {
    this.conditionSignal = condition;
  }

  @Input('pcAnimateIfEnter') set enter(className: string) {
    this._enterClass = className;
  }

  @Input('pcAnimateIfExit') set exit(className: string) {
    this._exitClass = className;
  }

  @Input() set duration(ms: number) {
    this._animationDuration = ms;
  }

  private toggle(condition: boolean) {
    if (condition === this._condition) return;

    this._condition = condition;

    if (condition) this.animatedEntry();
    else if (this.view) this.animatedExit();
  }

  /**
   * Remove the entry animation and add the exit animation, then set timeout for destruction
   * @returns void
   */
  private animatedExit() {
    if (!this.view?.rootNodes[0]) return;

    const el = this.view.rootNodes[0] as HTMLElement;

    // Remove entry animation in case it's still applied
    el.classList.remove(this._enterClass);

    // Add exit animation
    el.classList.add(this._exitClass);

    this.timeoutId = setTimeout(() => {
      // Cleanup all animation classes before removal
      el.classList.remove(this._enterClass, this._exitClass);
      this.vcr.clear();
      this.view = null;
    }, this._animationDuration);
  }

  /**
   * Add the entry animation
   */
  private animatedEntry() {
    this.vcr.clear();
    this.view = this.vcr.createEmbeddedView(this.template);
    const el = this.view.rootNodes[0] as HTMLElement;
    requestAnimationFrame(() => el?.classList.add(this._enterClass));
  }

  ngOnDestroy(): void {
    clearTimeout(this.timeoutId);

    if (this.view?.rootNodes[0]) {
      const el = this.view.rootNodes[0] as HTMLElement;
      el?.classList.remove(this._enterClass, this._exitClass);
    }
  }
}
