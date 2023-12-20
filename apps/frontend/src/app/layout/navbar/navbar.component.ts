import { CommonModule } from "@angular/common";
import { Component } from "@angular/core";

import { FormsModule } from "@angular/forms";
import { AuthService } from "@services/auth.service";
import { SearchService } from "@services/search.service";
import { ThemeService } from "@services/theme.service";
import { IconsComponent } from "@uxcommon/icons/icons.component";
import { SwapComponent } from "@uxcommon/swap/swap.component";

@Component({
  selector: "pplcrm-navbar",
  standalone: true,
  imports: [CommonModule, IconsComponent, SwapComponent, FormsModule],
  templateUrl: "./navbar.component.html",
  styleUrl: "./navbar.component.scss",
})
export class NavbarComponent {
  protected initialTheme = this.themeSvc.theme;
  protected searchStr = "";

  constructor(
    private auth: AuthService,
    private themeSvc: ThemeService,
    private searchSvc: SearchService,
  ) {}

  public clearSearch() {
    this.searchStr = "";
    this.searchSvc.clearSearch();
  }

  public search() {
    this.searchSvc.doSearch(this.searchStr);
  }

  public signOut() {
    this.auth.signOut();
  }

  public toggleTheme() {
    this.themeSvc.toggleTheme();
  }
}
