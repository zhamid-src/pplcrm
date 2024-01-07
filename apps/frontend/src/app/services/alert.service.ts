import { Injectable, signal } from '@angular/core';

export type ALERTTYPE = 'info' | 'error' | 'warning' | 'success';

export interface AlertMessage {
  OKBtn?: string;
  OKBtnCallback?: () => void;
  btn2?: string;
  btn2Callback?: () => void;
  duration?: number;
  text: string;
  title?: string;
  type?: ALERTTYPE;
}

@Injectable({
  providedIn: 'root',
})
export class AlertService {
  private _alerts = signal<AlertMessage[]>([]);

  public get alerts() {
    return this._alerts();
  }

  public OKBtnCallback(text: string) {
    const alertToRemove = this.alerts.find((m) => m.text === text);
    if (!alertToRemove) return;

    alertToRemove.OKBtnCallback?.();
  }

  public btn2Callback(text: string) {
    const alertToRemove = this.alerts.find((m) => m.text === text);
    if (!alertToRemove) return;

    alertToRemove.btn2Callback?.();
  }

  public dismiss(text: string) {
    this.removeAlert({ text });
  }

  public show(alert: AlertMessage) {
    // Ignore if duplicate
    if (this.alerts.find((m) => m.text === alert.text)) {
      return;
    }
    const messageWithMeta = { ...alert, createdAt: Date.now() };

    this._alerts.update((arr: AlertMessage[]) => {
      arr.unshift(messageWithMeta);
      return arr.slice(0);
    });

    // start the timer to remove
    setTimeout(
      () => this.removeAlert(messageWithMeta),
      messageWithMeta.duration || 2000,
      messageWithMeta,
    );
  }

  public showError(text: string) {
    this.show({ text, type: 'error' });
  }

  public showInfo(text: string) {
    this.show({ text, type: 'info' });
  }

  public showSuccess(text: string) {
    this.show({ text, type: 'success' });
  }

  public showWarn(text: string) {
    this.show({ text, type: 'warning' });
  }

  private removeAlert(alert: AlertMessage) {
    const alertToRemove = this.alerts.find((m) => m.text === alert.text);
    if (!alertToRemove) return;

    const index = this.alerts.indexOf(alertToRemove);
    this._alerts.update((arr) => {
      arr.splice(index, 1);
      return arr.slice(0);
    });
  }
}
