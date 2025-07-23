import { Component, HostListener, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from 'apps/frontend/src/app/auth/auth-service';
import { SearchService } from 'apps/frontend/src/app/data/search-service';
import { SidebarService } from 'apps/frontend/src/app/layout/sidebar-service';
import { ThemeService } from 'apps/frontend/src/app/layout/theme-service';
import { Icon } from '@uxcommon/icon';
import { Swap } from '@uxcommon/swap';

@Component({
  selector: 'pc-navbar',
  imports: [Icon, Swap, FormsModule],
  templateUrl: './navbar.html',
})
export class Navbar {
  /** Handles authentication-related operations. */
  private readonly auth = inject(AuthService);
  /** Controls the current visual theme (light/dark). */
  protected readonly themeSvc = inject(ThemeService);
  /** Manages shared search input across components. */
  private readonly searchSvc = inject(SearchService);
  /** Controls sidebar visibility on mobile and desktop. */
  private readonly sideBarSvc = inject(SidebarService);

  /** Indicates whether the search input is visible on mobile view. */
  protected searchOnMobile = false;

  /** Two-way bound string input for search bar. */
  protected searchStr = '';

  /**
   * Listen for Ctrl + K or Cmd + K to open search.
   * Prevents default browser behavior.
   */
  @HostListener('window:keydown', ['$event'])
  handleKeyDown(event: KeyboardEvent): void {
    const isCtrlOrCmd = event.ctrlKey || event.metaKey;
    const isK = event.key.toLowerCase() === 'k';

    if (isCtrlOrCmd && isK) {
      event.preventDefault();

      // TODO: have to move the cursor to search
      this.showSearchonMobile();
    }
  }

  /**
   * Clears the current search input and resets the mobile search bar state.
   */
  public clearSearch(): void {
    this.searchOnMobile = false;
    this.searchStr = '';
    this.searchSvc.clearSearch();
  }

  /**
   * Returns whether the mobile sidebar is currently open.
   */
  public isMobileOpen(): boolean {
    return this.sideBarSvc.isMobileOpen();
  }

  /**
   * Triggers the search using the current value in the search bar.
   */
  public search(): void {
    this.searchSvc.doSearch(this.searchStr);
  }

  /**
   * Signs the current user out and clears auth tokens.
   */
  public signOut(): void {
    this.auth.signOut();
  }

  /**
   * Toggles the sidebar open/closed in mobile view.
   */
  public toggleMobile(): void {
    this.sideBarSvc.toggleMobile();
  }

  /**
   * Switches the visual theme between light and dark mode.
   */
  public toggleTheme(): void {
    this.themeSvc.toggleTheme();
  }

  /**
   * Enables the mobile search input field.
   */
  protected showSearchonMobile(): void {
    this.searchOnMobile = true;
  }
}
