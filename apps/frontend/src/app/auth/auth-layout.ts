import { Component } from '@angular/core';
import { Alerts } from '@uxcommon/components/alerts/alerts';

@Component({
  selector: 'pc-auth-layout',
  imports: [Alerts],
  template: `
    <div class="bg-image flex min-h-screen font-light" data-theme="light" i18n-data-theme>
      <div class="card card-compact glass m-auto w-96 shadow-xl">
        <div class="card-title justify-center shadow-lg">
          <img class="p-5" src="assets/logo.png" />
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
