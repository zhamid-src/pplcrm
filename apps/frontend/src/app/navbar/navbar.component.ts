import { CommonModule } from "@angular/common";
import { Component } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { IconsComponent } from "../icons/icons.component";
import { AuthService } from "../services/auth.service";
import { SearchService } from "../services/search.service";
import { ThemeService } from "../services/theme.service";

@Component({
  selector: "pplcrm-navbar",
  standalone: true,
  imports: [CommonModule, IconsComponent, FormsModule],
  templateUrl: "./navbar.component.html",
  styleUrl: "./navbar.component.scss",
})
export class NavbarComponent {
  protected searchStr = "";
  protected initialTheme = this.themeSvc.theme;

  constructor(
    private auth: AuthService,
    private themeSvc: ThemeService,
    private searchSvc: SearchService,
  ) {}
  signOut() {
    this.auth.signOut();
  }

  search() {
    this.searchSvc.doSearch(this.searchStr);
  }

  toggleTheme() {
    this.themeSvc.toggleTheme();
  }

  clearSearch() {
    this.searchStr = "";
    this.searchSvc.clearSearch();
  }
}
