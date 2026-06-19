import { Component, computed, input, model } from '@angular/core';
import { Icon } from '@icons/icon';
import { PcIconNameType } from '@icons/icons.index';

export interface PcTabOption {
  id: string;
  label: string;
  icon?: PcIconNameType;
  badge?: string | number;
  disabled?: boolean;
  tooltip?: string;
}

@Component({
  selector: 'pc-tabs',
  imports: [Icon],
  template: `
    <div class="card bg-base-100 shadow-xl border border-base-300 flex-grow">
      <!-- Tabs Header -->
      <div role="tablist" class="tabs tabs-lifted w-full pt-4 px-4">
        @for (tab of tabs(); track tab.id) {
          <a
            role="tab"
            class="tab focus:outline-none cursor-pointer inline-flex items-center justify-center gap-1.5"
            [class.tab-active]="activeTab() === tab.id"
            [class.opacity-50]="tab.disabled"
            [class.cursor-not-allowed]="tab.disabled"
            [class.tooltip]="tab.disabled && tab.tooltip"
            [attr.data-tip]="tab.disabled && tab.tooltip ? tab.tooltip : null"
            (click)="!tab.disabled && selectTab(tab.id)"
          >
            @if (tab.icon) {
              <pc-icon [name]="tab.icon" [size]="4" class="flex-shrink-0"></pc-icon>
            }
            <span>{{ tab.label }}</span>
            @if (tab.badge !== undefined && tab.badge !== null) {
              <span class="badge badge-sm badge-neutral">{{ tab.badge }}</span>
            }
          </a>
        }
      </div>

      <!-- Tab Panels -->
      <div class="p-6">
        <ng-content></ng-content>
      </div>
    </div>
  `,
})
export class Tabs {
  public tabs = input.required<PcTabOption[]>();
  public activeTab = model.required<string>();

  public selectTab(id: string) {
    this.activeTab.set(id);
  }
}

@Component({
  selector: 'pc-tab-panel',
  template: `
    @if (isActive()) {
      <div class="space-y-4">
        <ng-content></ng-content>
      </div>
    }
  `,
})
export class TabPanel {
  public id = input.required<string>();
  public activeTab = input.required<string>();

  protected isActive = computed(() => this.activeTab() === this.id());
}
