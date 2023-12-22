import { CommonModule } from "@angular/common";
import { Component } from "@angular/core";
import { Router } from "@angular/router";
import { SidebarService } from "@services/sidebar.service";

@Component({
  selector: "pc-breadcrumb",
  standalone: true,
  imports: [CommonModule],
  templateUrl: "./breadcrumb.component.html",
  styleUrl: "./breadcrumb.component.scss",
})
export class BreadcrumbComponent {
  protected crumbs: string[] = [];
  constructor(
    private router: Router,
    private sidebarSvc: SidebarService,
  ) {
    this.router.events.subscribe(
      () => (this.crumbs = this.router.url.split("/").slice(1)),
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public navigate(destination: string) {
    const route = this.sidebarSvc.findRoute(destination);
    if (route) {
      this.router.navigateByUrl(route);
    }
  }
}
