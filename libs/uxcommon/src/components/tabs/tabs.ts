import { Component, computed, input, model } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

export interface PcTabOption {
  id: string;
  label: string;
  badge?: string | number;
  disabled?: boolean;
  tooltip?: string;
  /** When set, the pill renders as a router link (page-level tabs that navigate) instead of a stateful button. */
  route?: string;
  /** Match the route exactly for the active state (default false). */
  exact?: boolean;
}

const PILL_BASE =
  'inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-medium transition-colors focus:outline-none';
const PILL_ACTIVE = 'border-primary/30 bg-primary/10 text-primary';
const PILL_INACTIVE = 'border-base-200 bg-base-100 text-base-content/70';

/**
 * The one tab idiom (design §4): the pill tab bar from the person view, with count
 * badges ("numbers before clicks", §1). Stateful tabs bind `[(activeTab)]`; tabs that
 * navigate set `route` on the option instead. The only sanctioned exception is the
 * grain-tabs row on the People / Households / Companies grids.
 */
@Component({
  selector: 'pc-tab-bar',
  imports: [RouterLink, RouterLinkActive],
  host: { class: 'block' },
  template: `
    <div role="tablist" class="flex flex-wrap gap-2">
      @for (tab of tabs(); track tab.id) {
        @if (tab.route) {
          <a
            role="tab"
            [routerLink]="tab.route"
            routerLinkActive="!border-primary/30 !bg-primary/10 !text-primary"
            [routerLinkActiveOptions]="{ exact: tab.exact ?? false }"
            class="{{ pillBase }} {{ pillInactive }} cursor-pointer hover:bg-base-200/60"
          >
            <span>{{ tab.label }}</span>
            @if (tab.badge !== undefined && tab.badge !== null) {
              <span class="rounded-full bg-base-200 px-1.5 text-xs font-semibold tabular-nums text-base-content/50">{{
                tab.badge
              }}</span>
            }
          </a>
        } @else {
          <button
            type="button"
            role="tab"
            [attr.aria-selected]="activeTab() === tab.id"
            [attr.aria-disabled]="tab.disabled || null"
            [class]="pillClass(tab)"
            [class.tooltip]="tab.disabled && tab.tooltip"
            [attr.data-tip]="tab.disabled && tab.tooltip ? tab.tooltip : null"
            (click)="!tab.disabled && selectTab(tab.id)"
          >
            <span>{{ tab.label }}</span>
            @if (tab.badge !== undefined && tab.badge !== null) {
              <span
                class="rounded-full px-1.5 text-xs font-semibold tabular-nums"
                [class]="activeTab() === tab.id ? 'bg-primary/20 text-primary' : 'bg-base-200 text-base-content/50'"
                >{{ tab.badge }}</span
              >
            }
          </button>
        }
      }
    </div>
  `,
})
export class TabBar {
  public tabs = input.required<PcTabOption[]>();
  public activeTab = model<string>('');

  protected readonly pillBase = PILL_BASE;
  protected readonly pillInactive = PILL_INACTIVE;

  protected pillClass(tab: PcTabOption): string {
    const state = this.activeTab() === tab.id ? PILL_ACTIVE : PILL_INACTIVE;
    const cursor = tab.disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer';
    const hover = !tab.disabled && this.activeTab() !== tab.id ? 'hover:bg-base-200/60' : '';
    return `${PILL_BASE} ${state} ${cursor} ${hover}`;
  }

  protected selectTab(id: string): void {
    this.activeTab.set(id);
  }
}

/** Pill tab bar + the standard content card (the person-view composition) with projected pc-tab-panels. */
@Component({
  selector: 'pc-tabs',
  imports: [TabBar],
  host: { class: 'flex flex-grow flex-col gap-6' },
  template: `
    <pc-tab-bar [tabs]="tabs()" [(activeTab)]="activeTab" />
    <div class="card rounded-2xl border border-base-200 bg-base-100 p-6 shadow-sm">
      <ng-content></ng-content>
    </div>
  `,
})
export class Tabs {
  public tabs = input.required<PcTabOption[]>();
  public activeTab = model.required<string>();
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
