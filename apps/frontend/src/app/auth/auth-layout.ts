import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Alerts } from '@uxcommon/components/alerts/alerts';

/**
 * Shared layout for authentication pages providing logo and alert wrapper.
 */
@Component({
  selector: 'pc-auth-layout',
  standalone: true,
  imports: [CommonModule, Alerts],
  template: `
    <div class="bg-image flex min-h-screen font-light" data-theme="light">
      <div class="card card-compact glass m-auto w-96 shadow-xl">
        <div class="card-title mb-0 shadow-lg">
          <img class="p-5" src="assets/logo.svg" />
        </div>
        <pc-alerts />
        <div class="card-body">
          <ng-content />
        </div>
      </div>
    </div>
  `,
})
export class AuthLayoutComponent {}
