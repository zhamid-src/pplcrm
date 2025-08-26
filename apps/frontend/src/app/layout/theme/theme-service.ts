/**
 * @fileoverview Theme management service for application-wide light/dark mode support.
 * Provides reactive theme switching with system preference detection and persistent storage.
 */
import { Injectable, signal } from '@angular/core';

/**
 * Service for managing application theme with reactive state and persistent storage.
 *
 * This service provides comprehensive theme management functionality that respects
 * user preferences while maintaining consistency across the application. It integrates
 * with the system's color scheme preferences and provides smooth theme transitions.
 *
 * **Key Features:**
 * - **Reactive Theme State**: Uses Angular signals for efficient UI updates
 * - **Persistent Storage**: Saves user preference in localStorage
 * - **System Integration**: Detects and responds to OS theme changes
 * - **Automatic Sync**: Listens for system theme changes in real-time
 * - **Simple API**: Easy theme toggling and retrieval methods
 *
 * **Theme Resolution Priority:**
 * 1. Stored user preference (localStorage)
 * 2. System color scheme preference
 * 3. Default to light theme
 *
 * @example
 * ```typescript
 * constructor(private themeService: ThemeService) {
 *   // Get current theme
 *   const currentTheme = this.themeService.getTheme();
 *
 *   // Toggle theme
 *   this.themeService.toggleTheme();
 * }
 * ```
 *
 * @example
 * ```html
 * <!-- Apply theme in template -->
 * <div [attr.data-theme]="themeService.getTheme()">
 *   <!-- App content -->
 * </div>
 * ```
 */
@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  /**
   * Reactive signal representing the current theme ('light' or 'dark').
   * Initialized based on stored preference or system setting.
   */
  private readonly theme = signal<'light' | 'dark'>(this.getStoredTheme());

  /**
   * Sets up a listener for system theme changes (e.g., OS-level light/dark mode toggle).
   */
  constructor() {
    window.matchMedia('(prefers-color-scheme:dark)').addEventListener('change', (e) => {
      this.setTheme(e.matches ? 'dark' : 'light');
    });
  }

  /**
   * Returns the current theme value.
   *
   * @returns The current theme: `'light'` or `'dark'`.
   */
  public getTheme() {
    return this.theme();
  }

  /**
   * Toggles the theme between `'light'` and `'dark'`.
   * Updates the signal and persists the change in localStorage.
   */
  public toggleTheme() {
    this.setTheme(this.theme() === 'light' ? 'dark' : 'light');
  }

  /**
   * Determines the initial theme:
   * - Returns `'dark'` if system prefers dark mode or stored preference is `'dark'`.
   * - Otherwise returns `'light'`.
   *
   * @returns `'light'` or `'dark'` based on system and stored preferences.
   */
  private getStoredTheme() {
    const isSystemDark = window.matchMedia('(prefers-color-scheme:dark)').matches;
    return isSystemDark || localStorage.getItem('pc-theme') === 'dark' ? 'dark' : 'light';
  }

  /**
   * Updates the internal theme signal and saves it to localStorage.
   *
   * @param value - The new theme value: `'light'` or `'dark'`.
   */
  private setTheme(value: 'light' | 'dark') {
    this.theme.set(value);
    localStorage.setItem('pc-theme', this.theme());
  }
}
