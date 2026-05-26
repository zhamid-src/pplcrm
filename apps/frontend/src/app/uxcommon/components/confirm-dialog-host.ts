import { Component, ElementRef, computed, effect, inject, signal, viewChild } from '@angular/core';
import { Icon } from '@uxcommon/components/icons/icon';
import { ConfirmDialogService, DialogVariant } from '../../services/shared-dialog.service';

@Component({
  selector: 'pc-dialog-host',
  imports: [Icon],
  template: `
    <dialog #dlg class="modal">
      @if (state()) {
        <div class="modal-box">
          <div class="flex items-center gap-2">
            <pc-icon [name]="icon()" class="text-xl" />
            <h3 class="text-lg font-bold">{{ state()!.title }}</h3>
          </div>

          @if (state()!.message) {
            <p class="pt-4 pb-6 font-light whitespace-pre-line">{{ state()!.message }}</p>
          }

          @if (state()!.type === 'prompt') {
            <input
              [placeholder]="state()!.inputPlaceholder || ''"
              class="input input-bordered w-full mb-4"
              [value]="promptValue()"
              (input)="promptValue.set($any($event.target).value)"
            />
          }

          @if (state()!.type === 'choose') {
            <div class="flex flex-col gap-2 w-full mt-4">
              @for (choice of state()!.choices; track choice.label) {
                <button
                  class="btn w-full"
                  [class]="choiceBtnClass(choice.variant)"
                  (click)="onChoice(choice.value)"
                >
                  {{ choice.label }}
                </button>
              }
              @if (showCancel()) {
                <button class="btn w-full font-normal" (click)="onCancel()">{{ state()!.cancelText }}</button>
              }
            </div>
          } @else {
            <div class="flex justify-end gap-2">
              @if (showCancel()) {
                <button class="btn" (click)="onCancel()">{{ state()!.cancelText }}</button>
              }
              <button class="btn" [class]="confirmBtnClass()" (click)="onConfirm()">
                {{ state()!.confirmText }}
              </button>
            </div>
          }
        </div>

        <form method="dialog" class="modal-backdrop" (submit)="onBackdrop()">
          <button>close</button>
        </form>
      }
    </dialog>
  `,
})
export class ConfirmDialogHost {
  private readonly svc = inject(ConfirmDialogService);

  public readonly promptValue = signal(''); // signal instead of ngModel

  private readonly stateSignal = this.svc.stateSignal;
  private readonly openSignal = this.svc.isOpenSignal;
  public state = this.stateSignal;
  public confirmBtnClass = computed(() => {
    const v = (this.state()?.variant ?? 'neutral') as DialogVariant;
    switch (v) {
      case 'danger':
        return 'btn-error';
      case 'warning':
        return 'btn-warning';
      case 'info':
        return 'btn-info';
      case 'success':
        return 'btn-success';
      default:
        return '';
    }
  });

  public choiceBtnClass(v?: DialogVariant): string {
    if (!v) return '';
    switch (v) {
      case 'danger':
        return 'btn-error';
      case 'warning':
        return 'btn-warning';
      case 'info':
        return 'btn-info';
      case 'success':
        return 'btn-success';
      default:
        return '';
    }
  }

  public readonly dlgRef = viewChild.required<ElementRef<HTMLDialogElement>>('dlg');
  public icon = computed(() => this.state()?.icon ?? this.svc.defaultIconFor('neutral'));
  public showCancel = computed(() => {
    const st = this.state();
    if (!st) return false;
    if (st.type === 'choose') {
      return !!st.cancelText;
    }
    return !!st.cancelText && st.type !== 'alert';
  });

  constructor() {
    effect(() => {
      const open = this.openSignal();
      const dlg = this.dlgRef()?.nativeElement;
      if (!dlg) return;

      if (open) {
        this.promptValue.set(this.stateSignal()?.defaultValue ?? '');
        if (!dlg.open) {
          try {
            dlg.showModal();
          } catch {}
        }
      } else if (dlg.open) {
        try {
          dlg.close();
        } catch {}
      }
    });
  }

  public onBackdrop(): void {
    const st = this.state();
    if (st?.allowBackdropClose) this.svc.cancel();
  }

  public onCancel(): void {
    this.svc.cancel();
  }

  public onConfirm(): void {
    const st = this.state();
    if (!st) return;
    if (st.type === 'prompt') this.svc.ok(this.promptValue());
    else if (st.type === 'alert') this.svc.ok();
    else this.svc.ok(true);
  }

  public onChoice(value: unknown): void {
    this.svc.ok(value);
  }
}
