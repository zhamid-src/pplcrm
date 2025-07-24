import { Component, effect, ElementRef, HostListener, inject, signal, ViewChild } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { Icon } from '@uxcommon/icon';
import { Swap } from '@uxcommon/swap';

import { AuthService } from 'apps/frontend/src/app/auth/auth-service';
import { SearchService } from 'apps/frontend/src/app/data/search-service';
import { SidebarService } from 'apps/frontend/src/app/layout/sidebar-service';
import { ThemeService } from 'apps/frontend/src/app/layout/theme-service';

@Component({
  selector: 'pc-navbar',
  imports: [Icon, Swap, ReactiveFormsModule],
  templateUrl: './navbar.html',
})
export class Navbar {
  @ViewChild('searchInput') searchInputRef!: ElementRef<HTMLInputElement>;

  /** Handles authentication-related operations. */
  private readonly auth = inject(AuthService);

  /** Manages shared search input across components. */
  private readonly searchSvc = inject(SearchService);

  /** Controls sidebar visibility on mobile and desktop. */
  private readonly sideBarSvc = inject(SidebarService);

  /** Controls the current visual theme (light/dark). */
  protected readonly themeSvc = inject(ThemeService);

  /** Indicates whether the search input is visible on mobile view. */
  protected searchOnMobile = false;

  /** Indicates whether the search input is visible or not */
  protected searchBarVisible = signal(false);

  /** Indicates whether the search bar is being removed (for animation) */
  protected searchBarRemoving = signal(false);

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
    this.searchSvc.clearSearch();
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
    return this.sideBarSvc.isMobileOpen();
  }

  /**
   * Triggers the search using the current value in the search bar.
   */
  protected search(): void {
    this.searchSvc.doSearch(this.searchStr);
  }

  /**
   * Signs the current user out and clears auth tokens.
   */
  protected signOut(): void {
    this.auth.signOut();
  }

  /**
   * Toggles the sidebar open/closed in mobile view.
   */
  protected toggleMobile(): void {
    this.sideBarSvc.toggleMobile();
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
    this.searchBarRemoving.set(true);
    setTimeout(() => {
      this.searchBarVisible.set(false);
      this.searchBarRemoving.set(false);
    }, 200);
  }

  /**
   * Hide the search bar on losing focus if the
   * input text bar is empty
   */
  protected onBlurSearchBar() {
    console.log(this.searchStr);
    if (!this.searchStr.length) {
      this.hideSearchBar();
    }
  }
}
