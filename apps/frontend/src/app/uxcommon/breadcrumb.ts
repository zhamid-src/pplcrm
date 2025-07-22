import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { SidebarService } from 'apps/frontend/src/app/layout/sidebar-service';

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
  private router = inject(Router);
  private sidebarSvc = inject(SidebarService);

  protected crumbs: string[] = [];

  constructor() {
    this.router.events.subscribe(() => (this.crumbs = this.router.url.split('/').slice(1)));
  }

  public navigate(destination: string) {
    const route = this.sidebarSvc.getRoute(destination);
    if (route) {
      this.router.navigateByUrl(route);
    }
  }
}
