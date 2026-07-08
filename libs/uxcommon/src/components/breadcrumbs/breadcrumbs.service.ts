import { Injectable, signal } from '@angular/core';

import { PcBreadcrumb } from './breadcrumbs';

/**
 * The full breadcrumb strip published by the current page: the crumb trail plus
 * the optional "N of M filtered" record pager. Pages set this; the navbar renders it.
 * The pager's prev/next are callbacks (not outputs) so they can route back to the
 * page that owns the record-navigation handle from wherever the strip is rendered.
 */
export interface BreadcrumbTrail {
  crumbs: PcBreadcrumb[];
  positionLabel: string | null;
  hasPrev: boolean;
  hasNext: boolean;
  prevLabel: string;
  nextLabel: string;
  onPrev: () => void;
  onNext: () => void;
}

/**
 * Hoists the breadcrumb trail out of the page body and into the navbar.
 *
 * A page (via `pc-detail-header`, or directly) `set()`s its trail on init and
 * `clear()`s it on destroy; the navbar reads `trail()` and renders it. The router
 * destroys the old routed component before creating the new one, so a page's
 * clear-on-destroy always runs before the next page's set-on-init — list/grid pages
 * that never set a trail are left with a cleared (null) strip.
 */
@Injectable({ providedIn: 'root' })
export class BreadcrumbsService {
  private readonly _trail = signal<BreadcrumbTrail | null>(null);
  public readonly trail = this._trail.asReadonly();

  public set(trail: BreadcrumbTrail): void {
    this._trail.set(trail);
  }

  public clear(): void {
    this._trail.set(null);
  }
}
