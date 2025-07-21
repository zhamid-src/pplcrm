import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { AuthService } from '@services/backend/auth.service';
import { SearchService } from '@services/search.service';
import { SidebarService } from '@services/sidebar.service';
import { ThemeService } from '@services/theme.service';
import { IconsComponent } from '@uxcommon/icons/icons.component';
import { SwapComponent } from '@uxcommon/swap/swap.component';

@Component({
    selector: 'pc-navbar',
    imports: [CommonModule, IconsComponent, SwapComponent, FormsModule],
    templateUrl: './navbar.component.html',
    styleUrl: './navbar.component.scss'
})
export class NavbarComponent {
  protected searchOnMobile = false;
  protected searchStr = '';

  constructor(
    private auth: AuthService,
    protected themeSvc: ThemeService,
    private searchSvc: SearchService,
    private sideBarSvc: SidebarService,
  ) {}

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
