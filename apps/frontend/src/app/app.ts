import { Component, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ConfirmDialogHost } from '@uxcommon/components/confirm-dialog-host';

import { ThemeService } from 'apps/frontend/src/app/layout/theme/theme-service';

@Component({
  selector: 'pc-root',
  imports: [RouterModule, ConfirmDialogHost],
  template: `
    <!-- Dialog host lives inside the themed div so modals inherit data-theme (dark mode). -->
    <div class="min-h-full" [attr.data-theme]="themeSvc.getTheme()">
      <pc-dialog-host></pc-dialog-host>
      <router-outlet></router-outlet>
    </div>
  `,
})
export class AppComponent {
  protected themeSvc = inject(ThemeService);
}
