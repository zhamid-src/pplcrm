import { Component, input } from '@angular/core';
import { Icon } from '@icons/icon';
import { PcIconNameType } from '@icons/icons.index';

@Component({
  selector: 'pc-profile-card',
  imports: [Icon],
  template: `
    <div class="card bg-base-100 shadow-xl overflow-hidden border border-base-300 w-full">
      <!-- Decorative Card Header Gradient -->
      <div class="h-24 bg-gradient-to-r from-primary/20 via-primary/30 to-secondary/20"></div>

      <div class="px-6 pb-6 relative flex flex-col items-center">
        <!-- Avatar / Placeholder -->
        @if (avatarUrl() || avatarText() || iconName()) {
          <div class="avatar placeholder -mt-12 mb-3">
            <div
              class="bg-gradient-to-tr from-primary to-secondary text-primary-content rounded-full w-24 h-24 ring ring-base-100 ring-offset-4 text-3xl font-bold flex items-center justify-center shadow-lg overflow-hidden"
            >
              @if (avatarUrl()) {
                <img [src]="avatarUrl()!" alt="Avatar" class="w-full h-full object-cover" />
              } @else if (avatarText()) {
                {{ avatarText() }}
              } @else if (iconName()) {
                <pc-icon [name]="iconName()!" [size]="10"></pc-icon>
              }
            </div>
          </div>
        }

        <ng-content></ng-content>
      </div>
    </div>
  `,
})
export class ProfileCard {
  public avatarUrl = input<string | null | undefined>();
  public avatarText = input<string | null | undefined>();
  public iconName = input<PcIconNameType | null | undefined>();
}
