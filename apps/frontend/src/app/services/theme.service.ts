import { Injectable, signal } from "@angular/core";

@Injectable({
  providedIn: "root",
})
export class ThemeService {
  private _theme = signal<"light" | "dark">(this.getStoredTheme());

  constructor() {}

  get theme() {
    return this._theme();
  }

  toggleTheme() {
    this._theme.set(this._theme() === "light" ? "dark" : "light");
    localStorage.setItem("pplcrm-theme", this._theme());
  }

  private getStoredTheme() {
    return localStorage.getItem("pplcrm-theme") === "dark" ? "dark" : "light";
  }
}
