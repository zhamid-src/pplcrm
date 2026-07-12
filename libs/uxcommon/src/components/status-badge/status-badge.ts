import { Component, computed, input } from '@angular/core';

export type PcStatusType = 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'ghost';

@Component({
  selector: 'pc-status-badge',
  template: `
    <span class="badge font-semibold uppercase" [class]="badgeClass()">
      <ng-content></ng-content>
    </span>
  `,
})
export class StatusBadge {
  public type = input<PcStatusType>('ghost');
  public size = input<'xs' | 'sm' | 'md' | 'lg'>('xs');

  protected badgeClass = computed(() => {
    const t = this.type();
    let cls = '';
    if (this.size() === 'xs') cls += 'badge-xs ';
    else if (this.size() === 'sm') cls += 'badge-sm ';
    else if (this.size() === 'md') cls += 'badge-md ';
    else if (this.size() === 'lg') cls += 'badge-lg ';

    switch (t) {
      case 'success':
        return cls + 'badge-success text-success-content';
      case 'warning':
        return cls + 'badge-warning text-warning-content';
      case 'error':
        return cls + 'badge-error text-error-content';
      case 'info':
        return cls + 'badge-info text-info-content';
      case 'neutral':
        return cls + 'badge-neutral text-neutral-content';
      default:
        return cls + 'badge-ghost';
    }
  });
}
