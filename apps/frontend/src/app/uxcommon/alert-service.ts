import { Injectable, signal } from '@angular/core';

/**
 * The type of the alert. This is used to determine the color of the alert
 * and the icon to show.
 */
export type ALERTTYPE = 'info' | 'error' | 'warning' | 'success';

/**
 * The customizations that can be performed on the alert.
 */
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

  /**
   * The alerts that are currently shown.
   */
  public get alerts() {
    return this._alerts();
  }

  /**
   * When the OK button is clicked on the alert with the given text, then
   * call the given callback for the matching alert.
   *
   * @param text
   * @returns
   */
  public OKBtnCallback(text: string) {
    const alertToRemove = this.alerts.find((m) => m.text === text);
    if (!alertToRemove) return;

    alertToRemove.OKBtnCallback?.();
  }

  /**
   * When the second button is clicked on the alert with the given text, then
   * call the given callback for the matching alert.
   *
   * @param text
   * @returns
   */
  public btn2Callback(text: string) {
    const alertToRemove = this.alerts.find((m) => m.text === text);
    if (!alertToRemove) return;

    alertToRemove.btn2Callback?.();
  }

  /**
   * Dismiss the alert with the given text.
   *
   * @param text
   */
  public dismiss(text: string) {
    this.removeAlert({ text });
  }

  /**
   * Show the given alert.
   *
   * If the alert is already shown, then it will not be shown again.
   * Every alert will be removed after a default duration that can
   * be overridden via options.
   *
   * @see {@link AlertMessage} for more information about the options.
   *
   * @param alert
   * @returns
   */
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
    setTimeout(() => this.removeAlert(messageWithMeta), messageWithMeta.duration || 3000, messageWithMeta);
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

  /**
   * Remove the given alert from the list of alerts.
   *
   * @param alert
   * @returns
   */
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
