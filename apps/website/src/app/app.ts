import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

/**
 * Marketing site root. Unlike the CRM (user-selectable theme) and the companion
 * (follows the phone), the public site is light-only — a fixed `data-theme` so
 * the dark navy bands always read against a light page.
 */
@Component({
  selector: 'pc-website-root',
  imports: [RouterOutlet],
  template: `
    <div class="min-h-screen bg-base-100 text-base-content" data-theme="light">
      <router-outlet></router-outlet>
    </div>
  `,
})
export class AppComponent {}
