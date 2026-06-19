import { Component, input } from '@angular/core';
import { Icon } from '@icons/icon';
import { PcIconNameType } from '@icons/icons.index';

@Component({
  selector: 'pc-card',
  imports: [Icon],
  template: `
    <div class="card bg-base-100 border border-base-300 shadow-md overflow-hidden w-full">
      <div class="card-body p-6 space-y-4">
        @if (title() || icon() || subtitle()) {
          <div class="flex items-start justify-between gap-4 pb-2">
            <div class="flex items-start gap-2.5">
              @if (icon()) {
                <pc-icon [name]="icon()!" class="text-primary mt-0.5" [size]="5"></pc-icon>
              }
              <div>
                @if (title()) {
                  <h3 class="font-bold text-lg text-base-content leading-tight">{{ title() }}</h3>
                }
                @if (subtitle()) {
                  <p class="text-xs text-base-content/60 mt-0.5 leading-normal">{{ subtitle() }}</p>
                }
              </div>
            </div>
            <div class="flex items-center gap-2">
              <ng-content select="[pc-card-actions]"></ng-content>
            </div>
          </div>
          <div class="border-b border-base-200 -mt-2"></div>
        }

        <div class="space-y-4">
          <ng-content></ng-content>
        </div>
      </div>
    </div>
  `,
})
export class Card {
  public title = input<string>();
  public subtitle = input<string>();
  public icon = input<PcIconNameType>();
}
