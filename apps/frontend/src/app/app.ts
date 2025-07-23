import { Component, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ThemeService } from 'apps/frontend/src/app/layout/theme-service';

/**
 * The root component of the application.
 *
 * This component serves as the application shell. It applies the current
 * theme using `data-theme` attribute and acts as the host for routed views.
 */
@Component({
  selector: 'pc-root',
  imports: [RouterModule],
  template: `
    <div class="min-h-full" [attr.data-theme]="themeSvc.theme">
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
