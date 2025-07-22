import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  private _theme = signal<'light' | 'dark'>(this.getStoredTheme());

  constructor() {
    window.matchMedia('(prefers-color-scheme:dark)').addEventListener('change', (e) => {
      this.setTheme(e.matches ? 'dark' : 'light');
    });
  }

  public get theme() {
    return this._theme();
  }

  public toggleTheme() {
    this.setTheme(this._theme() === 'light' ? 'dark' : 'light');
  }

  private getStoredTheme() {
    const isSystemDark = window.matchMedia('(prefers-color-scheme:dark)').matches;
    return isSystemDark || localStorage.getItem('pc-theme') === 'dark' ? 'dark' : 'light';
  }

  private setTheme(value: 'light' | 'dark') {
    this._theme.set(value);
    localStorage.setItem('pc-theme', this._theme());
  }
}
