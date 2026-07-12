import { Component, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { Alerts } from '@uxcommon/components/alerts/alerts';
import { ConfirmDialogHost } from '@uxcommon/components/confirm-dialog-host';

/**
 * Companion app root. Unlike the CRM (user-selectable theme), the companion
 * follows the phone's color scheme — volunteers never see a settings screen.
 */
@Component({
  selector: 'pc-companion-root',
  imports: [RouterModule, ConfirmDialogHost, Alerts],
  template: `
    <!-- Dialog host lives inside the themed div so modals inherit data-theme (dark mode). -->
    <div class="min-h-screen bg-base-100 text-base-content" [attr.data-theme]="theme()">
      <pc-dialog-host></pc-dialog-host>
      <pc-alerts></pc-alerts>
      <router-outlet></router-outlet>
    </div>
  `,
})
export class AppComponent {
  protected readonly theme = signal<'light' | 'dark'>('light');

  constructor() {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    this.theme.set(media.matches ? 'dark' : 'light');
    media.addEventListener('change', (e) => this.theme.set(e.matches ? 'dark' : 'light'));
  }
}
