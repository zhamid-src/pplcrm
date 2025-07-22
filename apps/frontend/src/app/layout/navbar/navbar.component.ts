
import { Component, inject } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { AuthService } from '@services/backend/auth.service';
import { SearchService } from '@services/search.service';
import { SidebarService } from '@services/sidebar.service';
import { ThemeService } from '@services/theme.service';
import { IconsComponent } from '@uxcommon/icons/icons.component';
import { SwapComponent } from '@uxcommon/swap/swap.component';

@Component({
    selector: 'pc-navbar',
    imports: [IconsComponent, SwapComponent, FormsModule],
    templateUrl: './navbar.component.html',
    styleUrl: './navbar.component.css'
})
export class NavbarComponent {
  private auth = inject(AuthService);
  protected themeSvc = inject(ThemeService);
  private searchSvc = inject(SearchService);
  private sideBarSvc = inject(SidebarService);

  protected searchOnMobile = false;
  protected searchStr = '';

  public clearSearch() {
    this.searchOnMobile = false;
    this.searchStr = '';
    this.searchSvc.clearSearch();
  }

  public isMobileOpen() {
    return this.sideBarSvc.isMobileOpen();
  }

  public search() {
    this.searchSvc.doSearch(this.searchStr);
  }

  public async signOut() {
    await this.auth.signOut();
  }

  public toggleMobile() {
    this.sideBarSvc.toggleMobile();
  }

  public toggleTheme() {
    this.themeSvc.toggleTheme();
  }

  protected showSearchonMobile() {
    this.searchOnMobile = true;
  }
}
