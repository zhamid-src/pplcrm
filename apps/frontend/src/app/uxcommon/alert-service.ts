import { Injectable, signal } from '@angular/core';

/**
 * The options used to configure an alert message.
 */
export class AlertMessage {
  /** Label for the primary (OK) button. */
  OKBtn: string;

  /** Callback when OK button is clicked. */
  OKBtnCallback?: () => void;

  /** Label for a secondary button. */
  btn2?: string;

  /** Callback when the secondary button is clicked. */
  btn2Callback?: () => void;

  /** Duration in milliseconds before the alert is auto-dismissed. Defaults to 3000. */
  duration: number = 3000;

  /** Unique ID for the alert (auto-assigned if not provided). */
  id: string;

  /** Main alert message text. */
  text: string;

  /** Optional title for the alert. */
  title?: string;

  /** Alert type for styling and icon. */
  type?: ALERTTYPE;

  /** Is the alert being removed? Used for exit animation */
  private _removing = signal(true);

  constructor(init?: Partial<AlertMessage>) {
    Object.assign(this, init);
    this.id = init?.id ?? crypto.randomUUID();
    this.OKBtn = init?.OKBtn ?? 'OK';
    this.duration = init?.duration ?? 3000;
    this.text = init?.text ?? 'Alert';
    this.removing = init?.removing ?? false;
  }

  get removing() {
    return this._removing();
  }
  set removing(value: boolean) {
    this._removing.set(value);
  }
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
    const alert = this.findById(id);
    alert?.OKBtnCallback?.();
  }

  /**
   * Invokes the secondary button callback for the alert with the specified ID.
   * @param id - ID of the alert whose second button was clicked.
   */
  public btn2Callback(id: string): void {
    const alert = this.findById(id);
    alert?.btn2Callback?.();
  }

  /**
   * Dismisses the alert with the specified ID.
   * @param id - ID of the alert to dismiss.
   */
  public dismiss(id: string): void {
    const alert = this.findById(id);

    // We need the delay here to animate the exit.
    if (alert) {
      alert.removing = true;
      setTimeout(() => this._alerts.update((arr) => arr.filter((m) => m.id !== id)), 200);
    }
  }

  private findById(id: string) {
    return this.alerts.find((m) => m.id === id);
  }

  public isAlertRemoving(id: string) {
    const alert = this.findById(id);
    return alert?.removing;
  }
  /**
   * Shows a new alert if not already present.
   * @param alert - Alert options to display.
   */
  public show(alert: Partial<AlertMessage>): void {
    if (this.alerts.find((m) => m.text === alert.text)) return;

    const messageWithMeta: AlertMessage = new AlertMessage({ ...alert });
    this._alerts.update((arr: AlertMessage[]) => [messageWithMeta, ...arr]);
    setTimeout(() => this.dismiss(messageWithMeta.id), messageWithMeta.duration);
  }

  /**
   * Displays an error alert.
   * @param text - The error message to show.
   */
  public showError(text: string): void {
    this.show(new AlertMessage({ text, type: 'error' }));
  }

  /**
   * Displays an info alert.
   * @param text - The information message to show.
   */
  public showInfo(text: string): void {
    this.show(new AlertMessage({ text, type: 'info' }));
  }

  /**
   * Displays a success alert.
   * @param text - The success message to show.
   */
  public showSuccess(text: string): void {
    this.show(new AlertMessage({ text, type: 'success' }));
  }

  /**
   * Displays a warning alert.
   * @param text - The warning message to show.
   */
  public showWarn(text: string): void {
    this.show(new AlertMessage({ text, type: 'warning' }));
  }
}

/**
 * The type of the alert. Determines styling and icon used.
 */
export type ALERTTYPE = 'info' | 'error' | 'warning' | 'success';
