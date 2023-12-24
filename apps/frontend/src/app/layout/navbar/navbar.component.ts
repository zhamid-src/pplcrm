import { CommonModule } from "@angular/common";
import { Component } from "@angular/core";

import { FormsModule } from "@angular/forms";
import { AuthService } from "@services/auth.service";
import { PplCrmToastrService } from "@services/pplcrm-toast.service";
import { SearchService } from "@services/search.service";
import { SidebarService } from "@services/sidebar.service";
import { ThemeService } from "@services/theme.service";
import { IconsComponent } from "@uxcommon/icons/icons.component";
import { SwapComponent } from "@uxcommon/swap/swap.component";

@Component({
  selector: "pc-navbar",
  standalone: true,
  imports: [CommonModule, IconsComponent, SwapComponent, FormsModule],
  templateUrl: "./navbar.component.html",
  styleUrl: "./navbar.component.scss",
})
export class NavbarComponent {
  protected initialTheme = this.themeSvc.theme;
  protected searchStr = "";
  protected searchOnMobile = false;

  constructor(
    private auth: AuthService,
    private themeSvc: ThemeService,
    private searchSvc: SearchService,
    private sideBarSvc: SidebarService,
    private toast: PplCrmToastrService,
  ) {}

  protected showSearchonMobile() {
    this.searchOnMobile = true;
  }

  public clearSearch() {
    this.searchOnMobile = false;
    this.searchStr = "";
    this.searchSvc.clearSearch();
  }

  public search() {
    this.searchSvc.doSearch(this.searchStr);
  }

  public async signOut() {
    await this.auth.signOut();
    this.toast.info("You have been signed out.");
  }

  public isMobileOpen() {
    return this.sideBarSvc.isMobileOpen();
  }
  public toggleMobile() {
    this.sideBarSvc.toggleMobile();
  }

  public toggleTheme() {
    this.themeSvc.toggleTheme();
  }
}
