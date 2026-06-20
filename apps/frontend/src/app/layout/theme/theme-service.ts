import { signal, Service, inject, effect } from '@angular/core';
import { SettingsService } from '../../experiences/settings/services/settings-service';

@Service()
export class ThemeService {
  private readonly theme = signal<'light' | 'dark'>('light');
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

  public getTheme() {
    return this.theme();
  }

  public toggleTheme() {
    const next = this.theme() === 'light' ? 'dark' : 'light';
    this.theme.set(next);
    localStorage.setItem('pc-theme', next);
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
