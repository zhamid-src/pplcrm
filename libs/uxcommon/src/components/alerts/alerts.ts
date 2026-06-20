import { Component, computed, inject, input } from '@angular/core';
import { Icon } from '@icons/icon';
import { AnimateIfDirective } from '@uxcommon/directives/animate-if.directive';

import { ALERTTYPE, AlertService } from './alert-service';

@Component({
  selector: 'pc-alerts',
  imports: [Icon, AnimateIfDirective],
  templateUrl: './alerts.html',
})
export class Alerts {
  protected alertSvc = inject(AlertService);

  public position = input<'top' | 'bottom' | 'relative'>('bottom');

  protected OKBtnClick(id: string): void {
    this.alertSvc.OKBtnCallback(id);
    this.alertSvc.dismiss(id);
  }

  protected readonly alerts = computed(() => {
    const list = this.alertSvc.alertList();
    return this.position() === 'top' ? list.slice().reverse() : list;
  });

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
