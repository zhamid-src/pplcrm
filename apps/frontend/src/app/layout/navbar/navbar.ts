import { Component, effect, ElementRef, HostListener, inject, signal, ViewChild } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { AnimateIfDirective } from '@uxcommon/animate-if.directive';
import { Icon } from '@uxcommon/icon';
import { Swap } from '@uxcommon/swap';

import { AuthService } from 'apps/frontend/src/app/auth/auth-service';
import { SearchService } from 'apps/frontend/src/app/data/search-service';
import { SidebarService } from 'apps/frontend/src/app/layout/sidebar/sidebar-service';
import { ThemeService } from 'apps/frontend/src/app/layout/theme-service';

@Component({
  selector: 'pc-navbar',
  imports: [Icon, Swap, ReactiveFormsModule, AnimateIfDirective],
  templateUrl: './navbar.html',
})
export class Navbar {
  @ViewChild('searchInput') searchInputRef!: ElementRef<HTMLInputElement>;

  private readonly _auth = inject(AuthService);
  private readonly _searchSvc = inject(SearchService);
  private readonly _sideBarSvc = inject(SidebarService);
  protected readonly themeSvc = inject(ThemeService);

  /** Indicates whether the search input is visible on mobile view. */
  protected searchOnMobile = false;

  /** Indicates whether the search input is visible or not */
  protected searchBarVisible = signal(false);

  /** Two-way bound string input for search bar. */
  protected searchStr = '';

  constructor() {
    // Move focus to the search bar whenever it becomes visible
    effect(() => {
      if (this.searchBarVisible())
        queueMicrotask(() => {
          this.searchInputRef?.nativeElement?.focus();
        });
    });
  }

  /**
   * Handles user input from the search field.
   * Updates the `searchStr` property and triggers the search logic.
   *
   * @param event - The input event triggered when the user types in the search box.
   */
  protected onSearchInput(event: Event) {
    const input = event.target as HTMLInputElement;
    this.searchStr = input.value;
    this.search();
  }

  /**
   * Clears the current search input and resets the mobile search bar state.
   */
  public clearSearch(): void {
    this.searchOnMobile = false;
    this.searchStr = '';
    this._searchSvc.clearSearch();
  }

  /**
   * Listen for Ctrl + K or Cmd + K to open search.
   * Prevents default browser behavior.
   */
  @HostListener('window:keydown', ['$event'])
  public handleKeyDown(event: KeyboardEvent): void {
    const isCtrlOrCmd = event.ctrlKey || event.metaKey;
    const isK = event.key.toLowerCase() === 'k';

    if (isCtrlOrCmd && isK) {
      event.preventDefault();

      this.showSearchBar();
    } else if (event.key === 'Escape' && this.searchBarVisible()) {
      this.clearSearch();
      this.hideSearchBar();
    }
  }

  /**
   * Returns whether the mobile sidebar is currently open.
   */
  protected isMobileOpen(): boolean {
    return this._sideBarSvc.isMobileOpen();
  }

  /**
   * Triggers the search using the current value in the search bar.
   */
  protected search(): void {
    this._searchSvc.doSearch(this.searchStr);
  }

  /**
   * Signs the current user out and clears auth tokens.
   */
  protected signOut(): void {
    this._auth.signOut();
  }

  /**
   * Toggles the sidebar open/closed in mobile view.
   */
  protected toggleMobile(): void {
    this._sideBarSvc.toggleMobile();
  }

  /**
   * Switches the visual theme between light and dark mode.
   */
  protected toggleTheme(): void {
    this.themeSvc.toggleTheme();
  }

  /**
   * Show or hide the search bar
   */
  protected toggleSearch(): void {
    this.searchBarVisible.set(!this.searchBarVisible());
  }

  /**
   * Show the search bar
   */
  protected showSearchBar(): void {
    this.searchBarVisible.set(true);
  }

  /**
   * Hide the search bar
   */
  protected hideSearchBar(): void {
    this.searchBarVisible.set(false);
  }

  /**
   * Hide the search bar on losing focus if the
   * input text bar is empty
   */
  protected onBlurSearchBar() {
    if (!this.searchStr.length) {
      this.hideSearchBar();
    }
  }
}
