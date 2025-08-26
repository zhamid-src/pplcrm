import { Component, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ConfirmDialogHost } from '@uxcommon/confirm-dialog-host';

import { ThemeService } from 'apps/frontend/src/app/layout/theme/theme-service';

/**
 * The root component of the application.
 *
 * This component serves as the application shell and provides the foundation for the entire
 * application. It handles theme management by applying the current theme via the `data-theme`
 * attribute and acts as the host container for all routed views.
 *
 * Key responsibilities:
 * - Theme application and management
 * - Router outlet hosting for navigation
 * - Application-wide styling context
 *
 * @example
 * ```html
 * <!-- Rendered in index.html -->
 * <pc-root></pc-root>
 * ```
 */
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
  /**
   * Theme service used to apply and switch application themes.
   */
  protected themeSvc = inject(ThemeService);
}
