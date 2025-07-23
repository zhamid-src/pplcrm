import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';

import { SidebarService } from 'apps/frontend/src/app/layout/sidebar-service';

/**
 * Breadcrumb component for displaying and navigating
 * the current URL path as clickable segments.
 */
@Component({
  selector: 'pc-breadcrumb',
  imports: [],
  template: `
    <div class="breadcrumbs mt-auto pl-2 text-sm font-light text-gray-500">
      <ul>
        <li>home</li>
        @for (crumb of crumbs; track crumb) {
          <li>
            <span class="cursor-pointer" (click)="navigate(crumb)">{{ crumb }}</span>
          </li>
        }
      </ul>
    </div>
  `,
})
export class Breadcrumb {
  /**
   * Injected Angular Router instance for listening to route changes and navigation.
   */
  private router = inject(Router);

  /**
   * SidebarService is used to resolve internal routes for breadcrumb navigation.
   */
  private sidebarSvc = inject(SidebarService);

  /**
   * Array of current breadcrumb segments based on URL.
   */
  protected crumbs: string[] = [];

  constructor() {
    // Subscribe to route changes and update breadcrumb segments accordingly.
    this.router.events.subscribe(() => {
      this.crumbs = this.router.url.split('/').slice(1);
    });
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
}
