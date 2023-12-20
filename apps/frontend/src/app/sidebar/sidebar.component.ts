import { CommonModule } from "@angular/common";
import { Component, effect } from "@angular/core";
import { Router, RouterLink } from "@angular/router";
import { IconsComponent } from "../icons/icons.component";
import { SidebarService } from "../services/sidebar.service";
import { SwapComponent } from "../swap/swap.component";

@Component({
  selector: "pplcrm-sidebar",
  standalone: true,
  imports: [CommonModule, IconsComponent, RouterLink, SwapComponent],
  templateUrl: "./sidebar.component.html",
  styleUrl: "./sidebar.component.scss",
})
export class SidebarComponent {
  protected drawerOpen = true;
  private _items = this.sidebarSvc.items;

  constructor(
    private sidebarSvc: SidebarService,
    protected router: Router,
  ) {
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
