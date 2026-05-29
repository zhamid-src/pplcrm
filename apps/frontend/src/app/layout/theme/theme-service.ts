/**
 * @fileoverview Theme management service for application-wide light/dark mode support.
 * Provides reactive theme switching with system preference detection and persistent storage.
 */
import { signal, Service, inject, effect } from '@angular/core';
import { SettingsService } from '../../experiences/settings/services/settings-service';

/**
 * Service for managing application theme with reactive state and persistent storage.
 */
@Service()
export class ThemeService {
  /**
   * Reactive signal representing the current theme ('light' or 'dark').
   */
  private readonly theme = signal<'light' | 'dark'>('light');
  private readonly settingsSvc = inject(SettingsService, { optional: true });
  private lastDefaultTheme: string | null = null;

  /**
   * Sets up a listener for system theme changes and settings changes.
   */
  constructor() {
    this.updateTheme();

    window.matchMedia('(prefers-color-scheme:dark)').addEventListener('change', () => {
      this.updateTheme();
    });

    const svc = this.settingsSvc;
    if (svc) {
      effect(() => {
        // Access the snapshot signal to trigger reactive updates
        svc.snapshotSignal();
        this.updateTheme();
      });
    }
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
    const next = this.theme() === 'light' ? 'dark' : 'light';
    this.theme.set(next);
    localStorage.setItem('pc-theme', next);
  }

  /**
   * Updates the active theme based on priority:
   * 1. Stored user preference (localStorage 'pc-theme')
   * 2. Tenant default theme settings (from SettingsService)
   * 3. System color scheme preference
   */
  private updateTheme() {
    let defaultTheme: string | null = null;
    if (this.settingsSvc) {
      defaultTheme = this.settingsSvc.getValue<string>('appearance.theme') ?? null;
      if (defaultTheme === 'light' || defaultTheme === 'dark') {
        if (this.lastDefaultTheme !== null && this.lastDefaultTheme !== defaultTheme) {
          localStorage.removeItem('pc-theme');
        }
        this.lastDefaultTheme = defaultTheme;
      }
    }

    const stored = localStorage.getItem('pc-theme');
    if (stored === 'light' || stored === 'dark') {
      this.theme.set(stored);
      return;
    }

    if (defaultTheme === 'light' || defaultTheme === 'dark') {
      this.theme.set(defaultTheme);
      return;
    }

    const isSystemDark = window.matchMedia('(prefers-color-scheme:dark)').matches;
    this.theme.set(isSystemDark ? 'dark' : 'light');
  }
}
