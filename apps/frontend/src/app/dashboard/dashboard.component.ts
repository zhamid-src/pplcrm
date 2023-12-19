import { CommonModule } from "@angular/common";
import { Component, effect } from "@angular/core";
import { RouterLink, RouterModule } from "@angular/router";
import { IconsComponent } from "../icons/icons.component";
import { NavbarComponent } from "../navbar/navbar.component";
import { SidebarService } from "../services/sidebar.service";
import { SummaryComponent } from "../summary/summary.component";

@Component({
  selector: "pplcrm-dashboard",
  standalone: true,
  imports: [
    CommonModule,
    NavbarComponent,
    RouterLink,
    SummaryComponent,
    RouterModule,
    IconsComponent,
  ],
  templateUrl: "./dashboard.component.html",
  styleUrl: "./dashboard.component.scss",
})
export class DashboardComponent {
  private _items = this.sidebarSvc.items;
  protected drawerOpen = true;

  constructor(private sidebarSvc: SidebarService) {
    effect(() => {
      this._items = this.sidebarSvc.items;
    });
  }

  public get items() {
    return this._items;
  }

  toggleDrawer() {
    this.drawerOpen = !this.drawerOpen;
  }
}
