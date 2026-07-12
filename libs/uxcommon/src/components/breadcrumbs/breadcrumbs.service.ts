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
 * Every navigation gets a route-driven default trail (built from `data.breadcrumb`
 * by the frontend's BreadcrumbDefaultsService on NavigationEnd), so the strip is
 * never empty or stale. Pages that own a richer trail (detail views via
 * `pc-detail-header`, tabbed pages) `set()` theirs afterwards — their effects flush
 * after NavigationEnd, so the page's trail wins. No page needs to clear on destroy
 * anymore; the next navigation's default replaces whatever was published.
 */
@Injectable({ providedIn: 'root' })
export class BreadcrumbsService {
  private readonly _trail = signal<BreadcrumbTrail | null>(null);
  public readonly trail = this._trail.asReadonly();

  public set(trail: BreadcrumbTrail): void {
    this._trail.set(trail);
  }

  /** Publish a plain crumb trail with no record pager — the common case. */
  public setCrumbs(crumbs: PcBreadcrumb[]): void {
    this._trail.set({
      crumbs,
      positionLabel: null,
      hasPrev: false,
      hasNext: false,
      prevLabel: 'Previous record',
      nextLabel: 'Next record',
      onPrev: () => undefined,
      onNext: () => undefined,
    });
  }

  public clear(): void {
    this._trail.set(null);
  }
}
