
import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { SidebarService } from '@services/sidebar.service';

@Component({
    selector: 'pc-breadcrumb',
    imports: [],
    templateUrl: './breadcrumb.component.html',
    styleUrl: './breadcrumb.component.css'
})
export class BreadcrumbComponent {
  protected crumbs: string[] = [];

  constructor(
    private router: Router,
    private sidebarSvc: SidebarService,
  ) {
    this.router.events.subscribe(() => (this.crumbs = this.router.url.split('/').slice(1)));
  }

  public navigate(destination: string) {
    const route = this.sidebarSvc.getRoute(destination);
    if (route) {
      this.router.navigateByUrl(route);
    }
  }
}
