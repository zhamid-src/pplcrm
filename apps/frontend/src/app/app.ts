import { Component, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ConfirmDialogHost } from '@uxcommon/components/confirm-dialog-host';

import { ThemeService } from 'apps/frontend/src/app/layout/theme/theme-service';

@Component({
  selector: 'pc-root',
  imports: [RouterModule, ConfirmDialogHost],
  template: `
    <pc-dialog-host></pc-dialog-host>
    <div class="min-h-full" [attr.data-theme]="themeSvc.getTheme()">
      <router-outlet></router-outlet>
    </div>
  `,
})
export class AppComponent {
  protected themeSvc = inject(ThemeService);
}
