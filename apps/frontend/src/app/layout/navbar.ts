import { Component, inject } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { AuthService } from 'apps/frontend/src/app/auth/auth-service';
import { SearchService } from 'apps/frontend/src/app/data/search-service';
import { SidebarService } from 'apps/frontend/src/app/layout/sidebar-service';
import { ThemeService } from 'apps/frontend/src/app/layout/theme-service';
import { IconsComponent } from '@uxcommon/icons.component';
import { Swap } from '@uxcommon/swap';

@Component({
  selector: 'pc-navbar',
  imports: [IconsComponent, Swap, FormsModule],
  templateUrl: './navbar.html',
})
export class Navbar {
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

  public signOut() {
    return this.auth.signOut();
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
