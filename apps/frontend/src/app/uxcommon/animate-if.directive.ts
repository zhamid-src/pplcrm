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

/**
 * Structural directive to animate insertion and removal of an element based on a reactive condition.
 *
 * ### Usage:
 * ```html
 * <div
 *   *pcAnimateIf="mySignal; enter: 'animate-left'; exit: 'animate-exit-right'"
 * >
 *   I appear and disappear with animation!
 * </div>
 * ```
 *
 * ### Inputs:
 * - `*pcAnimateIf="mySignal"`: A `Signal<boolean>` controlling visibility.
 * - `pcAnimateIfEnter`: CSS class for entry animation (default: `'animate-left'`).
 * - `pcAnimateIfExit`: CSS class for exit animation (default: `'animate-exit-right'`).
 * - `duration`: Duration in milliseconds before the element is removed after exit animation (default: `300`).
 *
 * This directive assumes the animated element is the root node of the template.
 */
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

  /**
   * Main reactive condition controlling visibility.
   * Must be a `Signal<boolean>`.
   */
  @Input()
  set pcAnimateIf(condition: Signal<boolean>) {
    this.conditionSignal = condition;
  }

  /**
   * CSS class applied on element entry (insertion).
   * Default: `'animate-left'`.
   */
  @Input('pcAnimateIfEnter') set enter(className: string) {
    this._enterClass = className;
  }

  /**
   * CSS class applied on element exit (removal).
   * Default: `'animate-exit-right'`.
   */
  @Input('pcAnimateIfExit') set exit(className: string) {
    this._exitClass = className;
  }

  /**
   * Duration in milliseconds to wait before destroying the element after the exit animation.
   * Default: `300`.
   */
  @Input() set duration(ms: number) {
    this._animationDuration = ms;
  }

  /**
   * Show or hide the template with appropriate animations.
   * @param condition - Whether the element should be shown.
   */
  private toggle(condition: boolean) {
    if (condition === this._condition) return;

    this._condition = condition;

    if (condition) this.animatedEntry();
    else if (this.view) this.animatedExit();
  }

  /**
   * Performs the exit animation, then removes the view after a delay.
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
   * Renders the template and applies the entry animation.
   */
  private animatedEntry() {
    this.vcr.clear();
    this.view = this.vcr.createEmbeddedView(this.template);
    const el = this.view.rootNodes[0] as HTMLElement;
    requestAnimationFrame(() => el?.classList.add(this._enterClass));
  }

  /**
   * Cleanup any pending timeouts and remove animation classes.
   */
  ngOnDestroy(): void {
    clearTimeout(this.timeoutId);

    if (this.view?.rootNodes[0]) {
      const el = this.view.rootNodes[0] as HTMLElement;
      el?.classList.remove(this._enterClass, this._exitClass);
    }
  }
}
