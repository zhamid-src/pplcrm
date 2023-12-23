import { CommonModule } from "@angular/common";
import { Component, effect } from "@angular/core";
import { Router, RouterLink } from "@angular/router";
import { SidebarService } from "@services/sidebar.service";
import { IconsComponent } from "@uxcommon/icons/icons.component";
import { SwapComponent } from "@uxcommon/swap/swap.component";

@Component({
  selector: "pc-sidebar",
  standalone: true,
  imports: [CommonModule, IconsComponent, RouterLink, SwapComponent],
  templateUrl: "./sidebar.component.html",
  styleUrl: "./sidebar.component.scss",
})
export class SidebarComponent {
  private _items = this.sidebarSvc.items;

  protected drawerOpen =
    localStorage.getItem("pc-drawnOpen") === "false" ? false : true;

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

  public toggleDrawer() {
    this.drawerOpen = !this.drawerOpen;
    localStorage.setItem("pc-drawnOpen", this.drawerOpen.toString());
  }
}
