import { Injectable, signal } from '@angular/core';

/**
 * The type of the alert. Determines styling and icon used.
 */
export type ALERTTYPE = 'info' | 'error' | 'warning' | 'success';

/**
 * The options used to configure an alert message.
 */
export interface AlertMessage {
  /** Unique ID for the alert (auto-assigned if not provided). */
  id?: string;

  /** Main alert message text. */
  text: string;

  /** Optional title for the alert. */
  title?: string;

  /** Alert type for styling and icon. */
  type?: ALERTTYPE;

  /** Duration in milliseconds before the alert is auto-dismissed. Defaults to 3000. */
  duration?: number;

  /** Label for the primary (OK) button. */
  OKBtn?: string;

  /** Callback when OK button is clicked. */
  OKBtnCallback?: () => void;

  /** Label for a secondary button. */
  btn2?: string;

  /** Callback when the secondary button is clicked. */
  btn2Callback?: () => void;
}

@Injectable({
  providedIn: 'root',
})
export class AlertService {
  private _alerts = signal<AlertMessage[]>([]);

  /**
   * Returns a list of all currently active alerts.
   */
  public get alerts(): AlertMessage[] {
    return this._alerts();
  }

  /**
   * Invokes the OK button callback for the alert with the specified ID.
   * @param id - ID of the alert whose OK button was clicked.
   */
  public OKBtnCallback(id: string): void {
    const alert = this.alerts.find((m) => m.id === id);
    alert?.OKBtnCallback?.();
  }

  /**
   * Invokes the secondary button callback for the alert with the specified ID.
   * @param id - ID of the alert whose second button was clicked.
   */
  public btn2Callback(id: string): void {
    const alert = this.alerts.find((m) => m.id === id);
    alert?.btn2Callback?.();
  }

  /**
   * Dismisses the alert with the specified ID.
   * @param id - ID of the alert to dismiss.
   */
  public dismiss(id: string): void {
    this.removeAlertById(id);
  }

  /**
   * Shows a new alert if not already present.
   * @param alert - Alert options to display.
   */
  public show(alert: AlertMessage): void {
    if (this.alerts.find((m) => m.text === alert.text)) return;

    const messageWithMeta: AlertMessage = {
      ...alert,
      id: alert.id || crypto.randomUUID(),
    };

    this._alerts.update((arr: AlertMessage[]) => [messageWithMeta, ...arr]);

    setTimeout(() => this.removeAlertById(messageWithMeta.id!), messageWithMeta.duration ?? 3000);
  }

  /**
   * Displays an error alert.
   * @param text - The error message to show.
   */
  public showError(text: string): void {
    this.show({ text, type: 'error' });
  }

  /**
   * Displays an info alert.
   * @param text - The information message to show.
   */
  public showInfo(text: string): void {
    this.show({ text, type: 'info' });
  }

  /**
   * Displays a success alert.
   * @param text - The success message to show.
   */
  public showSuccess(text: string): void {
    this.show({ text, type: 'success' });
  }

  /**
   * Displays a warning alert.
   * @param text - The warning message to show.
   */
  public showWarn(text: string): void {
    this.show({ text, type: 'warning' });
  }

  /**
   * Removes an alert from the list by its ID.
   * @param id - ID of the alert to remove.
   */
  private removeAlertById(id: string): void {
    this._alerts.update((arr) => arr.filter((m) => m.id !== id));
  }
}
