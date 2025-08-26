/**
 * Navigation bar component providing search, theme switching, and user actions.
 */
import { Component, ElementRef, HostListener, ViewChild, effect, inject, signal } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { Icon } from '@icons/icon';
import { AnimateIfDirective } from '@uxcommon/directives/animate-if.directive';
import { FullScreenService } from '@uxcommon/fullscreen.service';
import { Swap } from '@uxcommon/swap/swap';

import { AuthService } from 'apps/frontend/src/app/auth/auth-service';
import { SearchService } from 'apps/frontend/src/app/backend-svc/search-service';
import { SidebarService } from 'apps/frontend/src/app/layout/sidebar/sidebar-service';
import { ThemeService } from 'apps/frontend/src/app/layout/theme/theme-service';

@Component({
  selector: 'pc-navbar',
  imports: [Icon, Swap, ReactiveFormsModule, AnimateIfDirective],
  templateUrl: './navbar.html',
})
/**
 * Top-level navigation bar displayed across the application.
 */
export class Navbar {
  private readonly auth = inject(AuthService);
  private readonly searchSvc = inject(SearchService);
  private readonly sideBarSvc = inject(SidebarService);

  private fullscreen = inject(FullScreenService);

  /** Indicates whether the search input is visible or not */
  protected readonly searchBarVisible = signal(false);
  protected readonly themeSvc = inject(ThemeService);

  /** Indicates whether the search input is visible on mobile view. */
  protected searchOnMobile = false;

  /** Two-way bound string input for search bar. */
  protected searchStr = '';

  @ViewChild('searchInput') public searchInputRef!: ElementRef<HTMLInputElement>;

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
   *
   * @param event - Keyboard event triggered from the window.
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
   * Hide the search bar
   */
  protected hideSearchBar(): void {
    this.searchBarVisible.set(false);
  }

  protected isFullScreenMode(): boolean {
    return this.fullscreen.isFullScreenMode();
  }

  /**
   * Returns whether the mobile sidebar is currently open.
   *
   * @returns `true` if the mobile sidebar is visible, otherwise `false`.
   */
  protected isMobileOpen(): boolean {
    return this.sideBarSvc.isMobileOpen;
  }

  /**
   * Hides the search bar when it loses focus and the input is empty.
   */
  protected onBlurSearchBar() {
    if (!this.searchStr.length) {
      this.hideSearchBar();
    }
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
   * Triggers the search using the current value in the search bar.
   */
  protected search(): void {
    this.searchSvc.doSearch(this.searchStr);
  }

  /**
   * Show the search bar
   */
  protected showSearchBar(): void {
    this.searchBarVisible.set(true);
  }

  /**
   * Signs the current user out and clears auth tokens.
   */
  protected signOut(): void {
    this.auth.signOut();
  }

  protected toggleFullScreen(): void {
    console.log('Toggling fullscreen mode');
    this.fullscreen.toggleFullScreen();
  }

  /**
   * Toggles the sidebar open/closed in mobile view.
   */
  protected toggleMobile(): void {
    this.sideBarSvc.toggleMobile();
  }

  /**
   * Show or hide the search bar
   */
  protected toggleSearch(): void {
    this.searchBarVisible.set(!this.searchBarVisible());
  }

  /**
   * Switches the visual theme between light and dark mode.
   */
  protected toggleTheme(): void {
    console.log('Toggling theme');
    this.themeSvc.toggleTheme();
  }
}
