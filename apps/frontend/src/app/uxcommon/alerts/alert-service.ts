import { Injectable, signal } from '@angular/core';

/**
 * The options used to configure an alert message.
 */
export class AlertMessage {
  public readonly pulse = signal(false);

  /** Is the alert visible? Used for exit animation directive */
  public readonly visible = signal(true);

  /** Label for the primary (OK) button. */
  public OKBtn: string;

  /** Callback when OK button is clicked. */
  public OKBtnCallback?: () => void;

  /** Label for a secondary button. */
  public btn2?: string;

  /** Callback when the secondary button is clicked. */
  public btn2Callback?: () => void;

  /** Duration in milliseconds before the alert is auto-dismissed. Defaults to 3000. */
  public duration = 3000;

  /** Unique ID for the alert (auto-assigned if not provided). */
  public id: string;

  /** Main alert message text. */
  public text: string;
  public timeoutId: NodeJS.Timeout | undefined;

  /** Optional title for the alert. */
  public title?: string;

  /** Alert type for styling and icon. */
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
  private readonly _alerts = signal<AlertMessage[]>([]);

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

    if (!alert) return;

    // Clear any pending removal timeout
    clearTimeout(alert.timeoutId);
    alert.timeoutId = undefined;

    alert.visible.set(false);

    // Have to let the animation do its thing first
    setTimeout(() => this._alerts.update((alerts) => alerts.filter((alert) => alert.id !== id)), 300);
  }

  /**
   * Shows a new alert if not already present.
   * @param alert - Alert options to display.
   */
  public show(alert: Partial<AlertMessage>): void {
    // If the same text is shown then ignore it. // TODO: right behaviour?
    const existing = this.alerts.find((m) => m.text === alert.text);

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
      this._alerts.update((arr: AlertMessage[]) => [messageWithMeta, ...arr]);
      messageWithMeta.timeoutId = setTimeout(() => this.dismiss(messageWithMeta.id), messageWithMeta.duration);
    }
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

  private findById(id: string) {
    return this.alerts.find((m) => m.id === id);
  }
}

/**
 * The type of the alert. Determines styling and icon used.
 */
export type ALERTTYPE = 'info' | 'error' | 'warning' | 'success';
