import { Component, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ThemeService } from 'apps/frontend/src/app/layout/theme-service';

@Component({
  imports: [RouterModule],
  selector: 'pc-root',
  template: ` <div class="min-h-full" [attr.data-theme]="themeSvc.theme">
    <router-outlet></router-outlet>
  </div>`,
})
export class AppComponent {
  protected themeSvc = inject(ThemeService);
}
