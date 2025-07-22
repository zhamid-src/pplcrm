import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { SidebarService } from '@services/sidebar.service';

@Component({
  selector: 'pc-breadcrumb',
  imports: [],
  templateUrl: './breadcrumb.component.html',
  styleUrl: './breadcrumb.component.css',
})
export class BreadcrumbComponent {
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
