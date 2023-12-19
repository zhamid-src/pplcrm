import { CommonModule } from "@angular/common";
import { Component } from "@angular/core";
import { IconsComponent } from "../icons/icons.component";
import { AuthService } from "../services/auth.service";
import { SearchService } from "../services/search.service";
import { ThemeService } from "../services/theme.service";

@Component({
  selector: "pplcrm-navbar",
  standalone: true,
  imports: [CommonModule, IconsComponent],
  templateUrl: "./navbar.component.html",
  styleUrl: "./navbar.component.scss",
})
export class NavbarComponent {
  constructor(
    private auth: AuthService,
    protected themeSvc: ThemeService,
    private searchSvc: SearchService,
  ) {}
  signOut() {
    this.auth.signOut();
  }

  toggleTheme() {
    this.themeSvc.toggleTheme();
  }

  search(target: EventTarget | null | undefined) {
    const str = (target as HTMLInputElement)?.value;
    if (str) {
      this.searchSvc.doSearch(str);
    } else {
      this.searchSvc.clearSearch();
    }
  }
}
