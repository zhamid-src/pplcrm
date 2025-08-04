import { Component, inject, input } from '@angular/core';
import { Icon } from '@uxcommon/icon';

import { AnimateIfDirective } from '../animate-if.directive';
import { ALERTTYPE, AlertService } from './alert-service';

@Component({
  selector: 'pc-alerts',
  standalone: true,
  imports: [Icon, AnimateIfDirective],
  templateUrl: './alerts.html',
})
export class Alerts {
  /** Injected alert service to handle alert logic */
  protected alertSvc = inject(AlertService);

  /**
   * The position of the alert container.
   * Can be 'top', 'bottom', or 'relative' to context.
   */
  public position = input<'top' | 'bottom' | 'relative'>('bottom');

  /**
   * Handles click on the OK button of an alert.
   * Triggers its callback (if defined) and dismisses the alert.
   *
   * @param id - The alert iod to identify the alert
   */
  protected OKBtnClick(id: string): void {
    this.alertSvc.OKBtnCallback(id);
    this.alertSvc.dismiss(id);
  }

  /**
   * Returns a list of active alerts, reversed if position is 'top'.
   * Used to control the visual order of alerts.
   *
   * @returns Array of active alerts
   */
  protected alerts() {
    return this.position() === 'top' ? this.alertSvc.getAlerts().slice().reverse() : this.alertSvc.getAlerts();
  }

  /**
   * Handles click on the second button of an alert.
   * Triggers its callback (if defined) and dismisses the alert.
   *
   * @param text - The alert text to identify the alert
   */
  protected btn2Click(id: string): void {
    this.alertSvc.btn2Callback(id);
    this.alertSvc.dismiss(id);
  }

  protected getEnterAnim(): string {
    return this.isPositionTop() || this.isPositionRelative() ? 'animate-down' : 'animate-up';
  }

  protected getExitAnim(): string {
    return this.isPositionTop() || this.isPositionRelative() ? 'animate-exit-up' : 'animate-exit-down';
  }

  /**
   * Returns the icon name associated with the given alert type.
   *
   * @param type - The type of the alert
   * @returns The corresponding icon name
   */
  protected icon(type: ALERTTYPE) {
    return type === 'success'
      ? 'check-circle'
      : type === 'warning'
        ? 'exclamation-triangle'
        : type === 'error'
          ? 'x-circle'
          : 'exclamation-circle';
  }

  protected isPositionBottom() {
    return this.position() === 'bottom';
  }

  protected isPositionRelative() {
    return this.position() === 'relative';
  }

  protected isPositionTop() {
    return this.position() === 'top';
  }
}
