/**
 * @fileoverview Alert system for displaying user notifications and messages.
 * Provides a comprehensive alert service with reactive state management, animations,
 * and support for various alert types including success, error, warning, and info.
 */
import { Injectable, signal } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

/**
 * Configuration class for alert messages with reactive properties and callbacks.
 *
 * This class encapsulates all the properties and behaviors of an individual alert,
 * including visual states, button configurations, and automatic dismissal timing.
 *
 * **Features:**
 * - Reactive visibility and pulse animations using Angular signals
 * - Configurable buttons with custom labels and callbacks
 * - Auto-dismissal with customizable duration
 * - Unique ID generation for tracking
 * - Type-based styling support
 *
 * @example
 * ```typescript
 * const alert = new AlertMessage({
 *   text: 'Operation completed successfully',
 *   type: 'success',
 *   duration: 5000,
 *   OKBtn: 'Got it',
 *   OKBtnCallback: () => console.log('User acknowledged')
 * });
 * ```
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

/**
 * Service for managing application-wide alert notifications.
 *
 * This service provides a centralized system for displaying various types of alerts
 * throughout the application. It manages alert lifecycle, prevents duplicates,
 * and provides convenient methods for common alert types.
 *
 * **Key Features:**
 * - 🎯 **Duplicate Prevention**: Prevents showing identical alerts simultaneously
 * - ⏱️ **Auto-Dismissal**: Configurable timeout for automatic alert removal
 * - 🎨 **Animation Support**: Smooth show/hide animations with pulse effects
 * - 🔄 **Reactive State**: Uses Angular signals for efficient UI updates
 * - 🎛️ **Multiple Types**: Built-in support for success, error, warning, and info alerts
 *
 * **Alert Lifecycle:**
 * 1. Alert is created and added to the queue
 * 2. Alert appears with entrance animation
 * 3. Auto-dismissal timer starts (if configured)
 * 4. User can manually dismiss or wait for timeout
 * 5. Exit animation plays before removal
 *
 * @example
 * ```typescript
 * constructor(private alertService: AlertService) {}
 *
 * // Simple success message
 * this.alertService.showSuccess('Data saved successfully!');
 *
 * // Custom alert with callback
 * this.alertService.show({
 *   text: 'Are you sure you want to delete this item?',
 *   type: 'warning',
 *   OKBtn: 'Delete',
 *   btn2: 'Cancel',
 *   OKBtnCallback: () => this.deleteItem(),
 *   btn2Callback: () => this.cancelDelete(),
 *   duration: 0 // No auto-dismiss
 * });
 * ```
 */
@Injectable({
  providedIn: 'root',
})
export class AlertService {
  /** Reactive stream containing all currently active alerts */
  private readonly alertsSubject = new BehaviorSubject<AlertMessage[]>([]);
  public readonly alerts$ = this.alertsSubject.asObservable();

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
    setTimeout(() => {
      const next = this.alertsSubject.value.filter((msg) => msg.id !== id);
      this.alertsSubject.next(next);
    }, 300);
  }

  /**
   * Returns a list of all currently active alerts.
   */
  public getAlerts(): AlertMessage[] {
    return this.alertsSubject.value;
  }

  /**
   * Shows a new alert if not already present.
   * @param alert - Alert options to display.
   */
  public show(alert: Partial<AlertMessage>): void {
    // If the same text is shown then ignore it. // TODO: right behaviour?
    const existing = this.alertsSubject.value.find((m) => m.text === alert.text);

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
      this.alertsSubject.next([messageWithMeta, ...this.alertsSubject.value]);
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
    return this.alertsSubject.value.find((m) => m.id === id);
  }
}

/**
 * The type of the alert. Determines styling and icon used.
 */
export type ALERTTYPE = 'info' | 'error' | 'warning' | 'success';
