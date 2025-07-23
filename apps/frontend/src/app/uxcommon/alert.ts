import { Component, signal, inject } from '@angular/core';
import { ALERTTYPE, AlertService } from '@uxcommon/alert-service';
import { Icon } from '@uxcommon/icon';

@Component({
  selector: 'pc-alert',
  imports: [Icon],
  templateUrl: './alert.html',
})
export class Alert {
  /** Injected alert service to handle alert logic */
  protected alertSvc = inject(AlertService);

  /**
   * The position of the alert container.
   * Can be 'top', 'bottom', or 'relative' to context.
   */
  position = signal<'top' | 'bottom' | 'relative'>('relative');

  /**
   * Returns a list of active alerts, reversed if position is 'top'.
   * Used to control the visual order of alerts.
   *
   * @returns Array of active alerts
   */
  protected alerts() {
    return this.position() === 'top' ? this.alertSvc.alerts.slice().reverse() : this.alertSvc.alerts;
  }

  /**
   * Handles click on the OK button of an alert.
   * Triggers its callback (if defined) and dismisses the alert.
   *
   * @param text - The alert text to identify the alert
   */
  public OKBtnClick(text: string): void {
    this.alertSvc.OKBtnCallback(text);
    this.alertSvc.dismiss(text);
  }

  /**
   * Handles click on the second button of an alert.
   * Triggers its callback (if defined) and dismisses the alert.
   *
   * @param text - The alert text to identify the alert
   */
  public btn2Click(id: string | undefined): void {
    if (id) {
      this.alertSvc.btn2Callback(id);
      this.alertSvc.dismiss(id);
    }
  }

  /**
   * Returns the icon name associated with the given alert type.
   *
   * @param type - The type of the alert
   * @returns The corresponding icon name
   */
  public icon(type: ALERTTYPE) {
    return type === 'success'
      ? 'check-circle'
      : type === 'warning'
        ? 'exclamation-triangle'
        : type === 'error'
          ? 'x-circle'
          : 'exclamation-circle';
  }
}
