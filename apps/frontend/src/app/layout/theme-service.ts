/**
 * Manages the application's light and dark theme preference using Angular signals
 * and persists the selection in local storage.
 */
import { Injectable, signal } from '@angular/core';

/**
 * A service to manage application theme (light or dark) in a reactive and persistent way.
 *
 * - Detects system preference on first load.
 * - Persists user preference in localStorage.
 * - Reactively updates theme across the app using Angular signals.
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
