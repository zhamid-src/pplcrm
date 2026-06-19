import { Component, input } from '@angular/core';
import { Icon } from '@icons/icon';
import { PcIconNameType } from '@icons/icons.index';

@Component({
  selector: 'pc-stat-card',
  imports: [Icon],
  template: `
    <div
      class="stats border border-base-200 bg-base-100 shadow-sm transition-all duration-200 hover:shadow-md flex flex-row items-center justify-between p-4 rounded w-full"
    >
      <div class="stat p-0 leading-normal">
        @if (title()) {
          <div class="stat-title text-xs font-semibold uppercase tracking-wider text-base-content/50">
            {{ title() }}
          </div>
        }
        <div class="stat-value text-xl font-extrabold mt-1 sm:text-2xl" [class]="valueColorClass()">
          {{ value() }}
        </div>
        <div class="stat-desc text-[10px] text-base-content/40 mt-1">
          @if (description()) {
            <span>{{ description() }}</span>
          }
          <ng-content select="[pc-stat-desc]"></ng-content>
        </div>
      </div>

      <div class="flex-shrink-0 flex items-center justify-center gap-2">
        @if (icon()) {
          <div class="w-12 h-12 rounded-xl flex items-center justify-center" [class]="iconBgClass()">
            <pc-icon [name]="icon()!" [size]="6" [class]="iconColorClass()"></pc-icon>
          </div>
        }
        <ng-content select="[pc-stat-extra]"></ng-content>
      </div>
    </div>
  `,
})
export class StatCard {
  public title = input<string>();
  public value = input<string | number>();
  public description = input<string>();
  public icon = input<PcIconNameType>();
  public valueColorClass = input<string>('text-base-content');
  public iconBgClass = input<string>('bg-base-200/50');
  public iconColorClass = input<string>('text-base-content/70');
}
