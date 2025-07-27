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
  private readonly _vcr = inject(ViewContainerRef);
  private readonly _template = inject(TemplateRef<any>);
  private _view: EmbeddedViewRef<any> | null = null;
  private _timeoutId: NodeJS.Timeout | undefined;

  private _condition = false;
  private _animationDuration = 300;
  private _enterClass = 'animate-left';
  private _exitClass = 'animate-exit-right';

  private _conditionSignal?: Signal<boolean>;

  constructor() {
    effect(() => {
      if (this._conditionSignal) {
        this.toggle(this._conditionSignal());
      }
    });
  }

  /**
   * Main reactive condition controlling visibility.
   * Must be a `Signal<boolean>`.
   */
  @Input()
  set pcAnimateIf(condition: Signal<boolean>) {
    this._conditionSignal = condition;
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
    else if (this._view) this.animatedExit();
  }

  /**
   * Performs the exit animation, then removes the view after a delay.
   */
  private animatedExit() {
    if (!this._view?.rootNodes[0]) return;

    const el = this._view.rootNodes[0] as HTMLElement;

    // Remove entry animation in case it's still applied
    el.classList.remove(this._enterClass);

    // Add exit animation
    el.classList.add(this._exitClass);

    this._timeoutId = setTimeout(() => {
      // Cleanup all animation classes before removal
      el.classList.remove(this._enterClass, this._exitClass);
      this._vcr.clear();
      this._view = null;
    }, this._animationDuration);
  }

  /**
   * Renders the template and applies the entry animation.
   */
  private animatedEntry() {
    this._vcr.clear();
    this._view = this._vcr.createEmbeddedView(this._template);
    const el = this._view.rootNodes[0] as HTMLElement;
    requestAnimationFrame(() => el?.classList.add(this._enterClass));
  }

  /**
   * Cleanup any pending timeouts and remove animation classes.
   */
  ngOnDestroy(): void {
    clearTimeout(this._timeoutId);

    if (this._view?.rootNodes[0]) {
      const el = this._view.rootNodes[0] as HTMLElement;
      el?.classList.remove(this._enterClass, this._exitClass);
    }
  }
}
