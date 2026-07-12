import { Component, ElementRef, effect, input, output, viewChild } from '@angular/core';
import { Icon } from '@icons/icon';
import { PcIconNameType } from '@icons/icons.index';

/**
 * The one modal chrome for form/tool dialogs: native <dialog> + DaisyUI modal
 * with the house header (primary icon, bold title, ghost-circle close) and a
 * `[pc-modal-footer]` slot for actions. Blocking yes/no decisions stay on
 * ConfirmDialogService — this shell is for dialogs with real content.
 *
 * Drive it either declaratively (`[open]="someSignal()"`) or imperatively via
 * a template ref (`#dlg` → `dlg.show()` / `dlg.close()`). `closed` fires on
 * every close path (X button, ESC, backdrop, programmatic).
 */
@Component({
  selector: 'pc-modal-shell',
  imports: [Icon],
  template: `
    <dialog #dlg class="modal" (close)="closed.emit()" (cancel)="onCancel($event)">
      <div class="modal-box" [class]="boxClass()">
        <div class="mb-5 flex items-center justify-between">
          <h3 class="flex items-center gap-2 text-lg font-bold">
            @if (icon(); as ic) {
              <pc-icon [name]="ic" [size]="5" class="text-primary" />
            }
            {{ title() }}
          </h3>
          <button type="button" class="btn btn-ghost btn-sm btn-circle" aria-label="Close" (click)="close()">
            <pc-icon name="x-mark" [size]="4" />
          </button>
        </div>
        <ng-content />
        <div class="modal-action empty:hidden">
          <ng-content select="[pc-modal-footer]" />
        </div>
      </div>
      @if (dismissible()) {
        <form method="dialog" class="modal-backdrop">
          <button type="submit" aria-label="Close">close</button>
        </form>
      }
    </dialog>
  `,
})
export class ModalShell {
  /** Extra classes for the modal box — width overrides only (e.g. 'max-w-3xl'). */
  public readonly boxClass = input<string>('');
  /** Allow ESC / backdrop-click to dismiss. Turn off for dialogs holding unsaved work. */
  public readonly dismissible = input<boolean>(true);
  public readonly icon = input<PcIconNameType | null>(null);
  /** Declarative visibility; leave unset to drive imperatively via show()/close(). */
  public readonly open = input<boolean | undefined>(undefined);
  public readonly title = input.required<string>();

  public readonly closed = output<void>();

  private readonly dlgRef = viewChild.required<ElementRef<HTMLDialogElement>>('dlg');

  constructor() {
    effect(() => {
      const open = this.open();
      if (open === undefined) return;
      const dlg = this.dlgRef().nativeElement;
      try {
        if (open && !dlg.open) dlg.showModal();
        else if (!open && dlg.open) dlg.close();
      } catch {
        /* dialog not connected yet — the next effect run settles it */
      }
    });
  }

  public close(): void {
    const dlg = this.dlgRef().nativeElement;
    if (dlg.open) dlg.close();
  }

  public show(): void {
    const dlg = this.dlgRef().nativeElement;
    if (!dlg.open) dlg.showModal();
  }

  protected onCancel(e: Event): void {
    if (!this.dismissible()) e.preventDefault();
  }
}
