import { signal, Service, inject, effect } from '@angular/core';
import { SettingsService } from '../../experiences/settings/services/settings-service';

/** What the user asked for; 'system' follows the OS `prefers-color-scheme`. */
export type ThemePreference = 'light' | 'dark' | 'system';

@Service()
export class ThemeService {
  private readonly theme = signal<'light' | 'dark'>('light');
  /** The user's stated preference (drives the settings segmented control). */
  private readonly preference = signal<ThemePreference>('system');
  private readonly settingsSvc = inject(SettingsService, { optional: true });
  private lastDefaultTheme: string | null = null;

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

  /** The resolved theme actually applied to the UI. */
  public getTheme() {
    return this.theme();
  }

  /** The user's stated preference: 'light', 'dark', or 'system'. */
  public getPreference(): ThemePreference {
    return this.preference();
  }

  public toggleTheme() {
    this.setPreference(this.theme() === 'light' ? 'dark' : 'light');
  }

  public setPreference(pref: ThemePreference) {
    // 'system' is stored explicitly so it wins over any workspace default and
    // follows the OS live via the matchMedia listener.
    localStorage.setItem('pc-theme', pref);
    this.updateTheme();
  }

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
      this.preference.set(stored);
      this.theme.set(stored);
      return;
    }

    if (stored === 'system') {
      this.preference.set('system');
      this.theme.set(this.systemTheme());
      return;
    }

    // No personal override: follow the workspace default, else the OS. Reported
    // to the UI as 'system' since the user hasn't pinned a specific theme.
    this.preference.set('system');
    if (defaultTheme === 'light' || defaultTheme === 'dark') {
      this.theme.set(defaultTheme);
      return;
    }
    this.theme.set(this.systemTheme());
  }

  private systemTheme(): 'light' | 'dark' {
    return window.matchMedia('(prefers-color-scheme:dark)').matches ? 'dark' : 'light';
  }
}
