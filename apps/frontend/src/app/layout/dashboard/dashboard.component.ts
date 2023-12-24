import { CommonModule } from "@angular/common";
import { Component } from "@angular/core";
import { RouterModule } from "@angular/router";
import { SidebarService } from "@services/sidebar.service";
import { BreadcrumbComponent } from "@uxcommon/breadcrumb/breadcrumb.component";
import { NavbarComponent } from "../navbar/navbar.component";
import { SidebarComponent } from "../sidebar/sidebar.component";

@Component({
  selector: "pc-dashboard",
  standalone: true,
  imports: [
    CommonModule,
    NavbarComponent,
    SidebarComponent,
    RouterModule,
    BreadcrumbComponent,
  ],
  templateUrl: "./dashboard.component.html",
  styleUrl: "./dashboard.component.scss",
})
export class DashboardComponent {
  constructor(private sidebarSvc: SidebarService) {}
  isMobileOpen() {
    return this.sidebarSvc.isMobileOpen();
  }
}
