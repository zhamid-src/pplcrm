import { Component, computed, effect, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

import { Icon } from '../icons/icon';
import { ISidebarItem } from 'apps/frontend/src/app/layout/sidebar/sidebar-items';
import { SidebarService } from 'apps/frontend/src/app/layout/sidebar/sidebar-service';

/**
 * Breadcrumb component for displaying and navigating
 * the current URL path as clickable segments.
 */
@Component({
  selector: 'pc-breadcrumb',
  imports: [Icon],
  template: `
    <div class="breadcrumbs mt-auto pl-2 text-sm font-light text-gray-500">
      <ul>
        <li>home</li>
        @for (crumb of crumbs; track crumb) {
          <li>
            <span class="cursor-pointer" (click)="navigate(crumb)">{{ crumb }}</span>
          </li>
        }
        <li>
          <pc-icon
            [name]="getIcon()"
            [size]="4"
            class="cursor-pointer"
            [class.opacity-40]="!canToggleFavourite()"
            (click)="toggleFavourite()"
          ></pc-icon>
        </li>
      </ul>
    </div>
  `,
})
export class Breadcrumb {
  /**
   * Injected Angular Router instance for listening to route changes and navigation.
   */
  private readonly router = inject(Router);

  /**
   * SidebarService is used to resolve internal routes for breadcrumb navigation.
   */
  private readonly sidebarSvc = inject(SidebarService);

  private readonly navigationUrl = computed(() => {
    const navigation = this.router.currentNavigation();
    if (navigation) {
      const finalUrl = navigation.finalUrl ?? navigation.initialUrl;
      return finalUrl.toString();
    }

    return this.router.url;
  });

  private currentItem?: ISidebarItem;
  private favourite = signal(false);

  /**
   * Array of current breadcrumb segments based on URL.
   */
  protected crumbs: string[] = [];

  constructor() {
    effect(() => this.handleNavigationChange(this.navigationUrl()));
  }

  /**
   * Navigate to the route associated with the clicked breadcrumb segment.
   *
   * Uses SidebarService to map breadcrumb names to routes.
   *
   * @param destination - The breadcrumb label (e.g., "dashboard", "tags")
   */
  public navigate(destination: string) {
    const route = this.sidebarSvc.getRoute(destination);
    if (route) {
      this.router.navigateByUrl(route);
    }
  }

  public toggleFavourite() {
    if (!this.currentItem?.route) {
      return;
    }

    const next = this.sidebarSvc.toggleFavourite(this.currentItem.route);
    this.favourite.set(next);
    this.currentItem.favourite = next;
  }

  protected canToggleFavourite() {
    return !!this.currentItem?.route;
  }

  protected getIcon() {
    return this.favourite() ? 'star-filled' : 'star';
  }

  private handleNavigationChange(url: string) {
    const cleanUrl = url.split('?')[0].split('#')[0];
    this.crumbs = cleanUrl.split('/').slice(1).filter(Boolean);
    this.currentItem = this.sidebarSvc.findItemForUrl(url);
    this.favourite.set(!!this.currentItem?.favourite);
  }
}
