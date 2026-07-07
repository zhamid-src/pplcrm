import { Component, computed, input } from '@angular/core';
import { StatusBadge } from '../status-badge/status-badge';
import type { PcStatusType } from '../status-badge/status-badge';

/** The household geocoding lifecycle as stored in `households.geocoding_status`. */
export type PcGeocodeStatus = 'success' | 'pending' | 'failed' | null | undefined;

interface GeocodeChipSpec {
  label: string;
  type: PcStatusType;
}

/**
 * The single, binding surface for a household's geocode state (§6 consumers):
 * "Located / Locating… / Address problem" — never a hidden row. Wave 2
 * (canvassing readiness, delivery coverage) reads the same three states.
 *
 * DB status → chip:
 *  - `success`            → **Located** (success — done)
 *  - `pending` / `null`   → **Locating…** (info — in progress)
 *  - `failed`             → **Address problem** (warning — needs attention)
 */
export function geocodeChipSpec(status: PcGeocodeStatus | string): GeocodeChipSpec {
  switch (status) {
    case 'success':
      return { label: 'Located', type: 'success' };
    case 'failed':
      return { label: 'Address problem', type: 'warning' };
    default:
      return { label: 'Locating…', type: 'info' };
  }
}

@Component({
  selector: 'pc-geocode-chip',
  imports: [StatusBadge],
  template: ` <pc-status-badge [type]="spec().type" [size]="size()">{{ spec().label }}</pc-status-badge> `,
})
export class GeocodeChip {
  public readonly status = input<PcGeocodeStatus | string>(null);
  public readonly size = input<'sm' | 'md' | 'lg'>('sm');

  protected readonly spec = computed(() => geocodeChipSpec(this.status()));
}
