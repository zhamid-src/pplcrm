import { Component, computed, inject, input } from '@angular/core';
import { Icon } from '@icons/icon';
import type { PcIconNameType } from '@icons/icons.index';
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

  protected readonly alerts = computed(() => {
    const list = this.alertSvc.alertList();
    // Service list is newest-first; render newest nearest the pinned edge
    // (bottom of the stack when pinned bottom — spec §2).
    return this.isPositionBottom() ? list.slice().reverse() : list;
  });

  protected dismiss(id: string): void {
    this.alertSvc.dismiss(id);
  }

  protected getEnterAnim(): string {
    return this.isPositionTop() || this.isPositionRelative() ? 'animate-down' : 'animate-up';
  }

  protected getExitAnim(): string {
    return this.isPositionTop() || this.isPositionRelative() ? 'animate-exit-up' : 'animate-exit-down';
  }

  protected icon(type?: ALERTTYPE): PcIconNameType {
    return type === 'success'
      ? 'check-circle'
      : type === 'warning'
        ? 'exclamation-triangle'
        : type === 'error'
          ? 'exclamation-circle'
          : 'information-circle';
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

  /** Tone accent bar hugging the card's left edge — the card surface and text stay neutral. */
  protected barToneClass(type?: ALERTTYPE): string {
    return type === 'success'
      ? 'bg-success'
      : type === 'warning'
        ? 'bg-warning'
        : type === 'error'
          ? 'bg-error'
          : 'bg-info';
  }

  /** Tone lives on the icon and the left accent bar — the card surface and text stay neutral. */
  protected toneClass(type?: ALERTTYPE): string {
    return type === 'success'
      ? 'text-success'
      : type === 'warning'
        ? 'text-warning'
        : type === 'error'
          ? 'text-error'
          : 'text-info';
  }
}
