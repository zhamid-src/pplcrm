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

@Directive({
  selector: '[pcAnimateIf]',
})
export class AnimateIfDirective {
  private readonly template = inject(TemplateRef<unknown>);
  private readonly vcr = inject(ViewContainerRef);
  private readonly destroyRef = inject(DestroyRef);

  public readonly duration = input(300, { alias: 'pcAnimateIfDuration' });

  public readonly pcAnimateIfEnter = input('animate-left');

  public readonly pcAnimateIfExit = input('animate-exit-right');

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

  private animatedEntry() {
    this.vcr.clear();
    this.view = this.vcr.createEmbeddedView(this.template);
    const enterClass = this.pcAnimateIfEnter();
    const el = this.view.rootNodes[0] as HTMLElement;
    requestAnimationFrame(() => el?.classList.add(enterClass));
  }

  private animatedExit() {
    if (!this.view?.rootNodes[0]) return;

    const el = this.view.rootNodes[0] as HTMLElement;
    const enterClass = this.pcAnimateIfEnter();
    const exitClass = this.pcAnimateIfExit();

    // Remove entry animation in case it's still applied
    el.classList.remove(enterClass);

    // If exit animation is 'animate-none', clear the view immediately without delay
    if (exitClass === 'animate-none') {
      this.vcr.clear();
      this.view = null;
      return;
    }

    // Add exit animation
    el.classList.add(exitClass);

    this.timeoutId = setTimeout(() => {
      // Cleanup all animation classes before removal
      el.classList.remove(enterClass, exitClass);
      this.vcr.clear();
      this.view = null;
    }, this.duration());
  }

  private toggle(condition: boolean) {
    if (condition === this.condition) return;

    this.condition = condition;

    if (condition) this.animatedEntry();
    else if (this.view) this.animatedExit();
  }
}
