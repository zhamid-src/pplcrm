import {
  Directive,
  DestroyRef,
  EmbeddedViewRef,
  Signal,
  TemplateRef,
  ViewContainerRef,
  effect,
  inject,
  input,
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
})
export class AnimateIfDirective {
  private readonly template = inject(TemplateRef<unknown>);
  private readonly vcr = inject(ViewContainerRef);
  private readonly destroyRef = inject(DestroyRef);

  /**
   * Duration in milliseconds to wait before destroying the element after the exit animation.
   * Default: `300`.
   */
  public readonly duration = input(300);

  /**
   * CSS class applied on element entry (insertion).
   * Default: `'animate-left'`.
   */
  public readonly pcAnimateIfEnter = input('animate-left');

  /**
   * CSS class applied on element exit (removal).
   * Default: `'animate-exit-right'`.
   */
  public readonly pcAnimateIfExit = input('animate-exit-right');

  /**
   * Main reactive condition controlling visibility.
   * Must be a `Signal<boolean>`.
   */
  public readonly pcAnimateIf = input.required<Signal<boolean>>();

  private condition = false;
  private timeoutId: NodeJS.Timeout | undefined;
  private view: EmbeddedViewRef<unknown> | null = null;

  constructor() {
    effect(() => {
      const conditionSignal = this.pcAnimateIf();
      if (conditionSignal) {
        this.toggle(conditionSignal());
      }
    });

    this.destroyRef.onDestroy(() => {
      clearTimeout(this.timeoutId);

      if (this.view?.rootNodes[0]) {
        const el = this.view.rootNodes[0] as HTMLElement;
        el?.classList.remove(this.pcAnimateIfEnter(), this.pcAnimateIfExit());
      }
    });
  }

  /**
   * Renders the template and applies the entry animation.
   */
  private animatedEntry() {
    this.vcr.clear();
    this.view = this.vcr.createEmbeddedView(this.template);
    const enterClass = this.pcAnimateIfEnter();
    const el = this.view.rootNodes[0] as HTMLElement;
    requestAnimationFrame(() => el?.classList.add(enterClass));
  }

  /**
   * Performs the exit animation, then removes the view after a delay.
   */
  private animatedExit() {
    if (!this.view?.rootNodes[0]) return;

    const el = this.view.rootNodes[0] as HTMLElement;
    const enterClass = this.pcAnimateIfEnter();
    const exitClass = this.pcAnimateIfExit();

    // Remove entry animation in case it's still applied
    el.classList.remove(enterClass);

    // Add exit animation
    el.classList.add(exitClass);

    this.timeoutId = setTimeout(() => {
      // Cleanup all animation classes before removal
      el.classList.remove(enterClass, exitClass);
      this.vcr.clear();
      this.view = null;
    }, this.duration());
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
