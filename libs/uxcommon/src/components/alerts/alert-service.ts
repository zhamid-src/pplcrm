import { Injectable, signal } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';

export class AlertMessage {
  public readonly pulse = signal(false);

  public readonly visible = signal(true);

  public OKBtn: string;

  public OKBtnCallback?: () => void;

  public btn2?: string;

  public btn2Callback?: () => void;

  public duration = 3000;

  public id: string;

  public text: string;
  public timeoutId: NodeJS.Timeout | undefined;

  public title?: string;

  public type?: ALERTTYPE;

  constructor(init?: Partial<AlertMessage>) {
    Object.assign(this, init);
    this.id = init?.id ?? crypto.randomUUID();
    this.OKBtn = init?.OKBtn ?? 'OK';
    this.duration = init?.duration ?? 3000;
    this.text = init?.text ?? 'Alert';
  }
}

@Injectable({
  providedIn: 'root',
})
export class AlertService {
  private readonly alertsSignal = signal<AlertMessage[]>([]);
  public readonly alerts$ = toObservable(this.alertsSignal);

  public readonly alertList = this.alertsSignal.asReadonly();

  public OKBtnCallback(id: string): void {
    const alert = this.findById(id);
    alert?.OKBtnCallback?.();
  }

  public btn2Callback(id: string): void {
    const alert = this.findById(id);
    alert?.btn2Callback?.();
  }

  public dismiss(id: string): void {
    const alert = this.findById(id);

    if (!alert) return;

    // Clear any pending removal timeout
    clearTimeout(alert.timeoutId);
    alert.timeoutId = undefined;

    alert.visible.set(false);

    // Have to let the animation do its thing first
    setTimeout(() => {
      const next = this.alertsSignal().filter((msg) => msg.id !== id);
      this.alertsSignal.set(next);
    }, 300);
  }

  public getAlerts(): AlertMessage[] {
    return this.alertsSignal();
  }

  public show(alert: Partial<AlertMessage>): void {
    // If the same text is shown then ignore it. // TODO: right behaviour?
    const existing = this.alertsSignal().find((m) => m.text === alert.text);

    if (existing) {
      // Retrigger the pulse animation
      existing.pulse.set(false); // ← reset first

      // Re-set to true in next frame (or ~immediately)
      setTimeout(() => existing.pulse.set(true), 0);

      // Extend dismissal timeout by 1 second
      clearTimeout(existing.timeoutId);
      existing.timeoutId = setTimeout(() => this.dismiss(existing.id), existing.duration + 1000);
    } else {
      const messageWithMeta: AlertMessage = new AlertMessage({ ...alert });
      this.alertsSignal.update((list) => [messageWithMeta, ...list]);

      if (messageWithMeta.duration) {
        messageWithMeta.timeoutId = setTimeout(() => this.dismiss(messageWithMeta.id), messageWithMeta.duration);
      }
    }
  }

  public showError(text: string): void {
    this.show(new AlertMessage({ text, type: 'error' }));
  }

  public showInfo(text: string): void {
    this.show(new AlertMessage({ text, type: 'info' }));
  }

  public showSuccess(text: string): void {
    this.show(new AlertMessage({ text, type: 'success' }));
  }

  public showWarn(text: string): void {
    this.show(new AlertMessage({ text, type: 'warning' }));
  }

  private findById(id: string) {
    return this.alertsSignal().find((m) => m.id === id);
  }
}

export type ALERTTYPE = 'info' | 'error' | 'warning' | 'success';
