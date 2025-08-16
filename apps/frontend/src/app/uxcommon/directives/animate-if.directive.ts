import {
  Directive,
  EmbeddedViewRef,
  Input,
  OnDestroy,
  Signal,
  TemplateRef,
  ViewContainerRef,
  effect,
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
  private readonly template = inject(TemplateRef<unknown>);
  private readonly vcr = inject(ViewContainerRef);

  private animationDuration = 300;
  private condition = false;
  private conditionSignal?: Signal<boolean>;
  private enterClass = 'animate-left';
  private exitClass = 'animate-exit-right';
  private timeoutId: NodeJS.Timeout | undefined;
  private view: EmbeddedViewRef<unknown> | null = null;

  constructor() {
    effect(() => {
      if (this.conditionSignal) {
        this.toggle(this.conditionSignal());
      }
    });
  }

  /**
   * Duration in milliseconds to wait before destroying the element after the exit animation.
   * Default: `300`.
   */
  @Input() public set duration(ms: number) {
    this.animationDuration = ms;
  }

  /**
   * CSS class applied on element entry (insertion).
   * Default: `'animate-left'`.
   */
  @Input('pcAnimateIfEnter') public set enter(className: string) {
    this.enterClass = className;
  }

  /**
   * CSS class applied on element exit (removal).
   * Default: `'animate-exit-right'`.
   */
  @Input('pcAnimateIfExit') public set exit(className: string) {
    this.exitClass = className;
  }

  /**
   * Main reactive condition controlling visibility.
   * Must be a `Signal<boolean>`.
   */
  @Input()
  public set pcAnimateIf(condition: Signal<boolean>) {
    this.conditionSignal = condition;
  }

  /**
   * Cleanup any pending timeouts and remove animation classes.
   */
  public ngOnDestroy(): void {
    clearTimeout(this.timeoutId);

    if (this.view?.rootNodes[0]) {
      const el = this.view.rootNodes[0] as HTMLElement;
      el?.classList.remove(this.enterClass, this.exitClass);
    }
  }

  /**
   * Renders the template and applies the entry animation.
   */
  private animatedEntry() {
    this.vcr.clear();
    this.view = this.vcr.createEmbeddedView(this.template);
    const el = this.view.rootNodes[0] as HTMLElement;
    requestAnimationFrame(() => el?.classList.add(this.enterClass));
  }

  /**
   * Performs the exit animation, then removes the view after a delay.
   */
  private animatedExit() {
    if (!this.view?.rootNodes[0]) return;

    const el = this.view.rootNodes[0] as HTMLElement;

    // Remove entry animation in case it's still applied
    el.classList.remove(this.enterClass);

    // Add exit animation
    el.classList.add(this.exitClass);

    this.timeoutId = setTimeout(() => {
      // Cleanup all animation classes before removal
      el.classList.remove(this.enterClass, this.exitClass);
      this.vcr.clear();
      this.view = null;
    }, this.animationDuration);
  }

  /**
   * Show or hide the template with appropriate animations.
   * @param condition - Whether the element should be shown.
   */
  private toggle(condition: boolean) {
    if (condition === this.condition) return;

    this.condition = condition;

    if (condition) this.animatedEntry();
    else if (this.view) this.animatedExit();
  }
}
