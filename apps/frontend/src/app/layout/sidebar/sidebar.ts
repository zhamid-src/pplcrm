import { Component, DestroyRef, WritableSignal, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NgTemplateOutlet } from '@angular/common';
import {
  NavigationCancel,
  NavigationError,
  NavigationStart,
  Router,
  RouterLink,
  RouterLinkActive,
} from '@angular/router';
import { filter, map } from 'rxjs';
import { Icon } from '@icons/icon';
import { Swap } from '@uxcommon/components/swap/swap';

import { SidebarService } from 'apps/frontend/src/app/layout/sidebar/sidebar-service';
import { AuthService } from 'apps/frontend/src/app/auth/auth-service';
import { ISidebarItem } from './sidebar-items';
import { AnimateIfDirective } from '@uxcommon/directives/animate-if.directive';

@Component({
  selector: 'pc-sidebar',
  imports: [NgTemplateOutlet, Icon, RouterLink, RouterLinkActive, Swap, AnimateIfDirective],
  templateUrl: './sidebar.html',
  styles: [
    `
      .tooltip:before {
        z-index: 100 !important;
      }
    `,
  ],
})
export class Sidebar {
  private readonly sidebarSvc = inject(SidebarService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected hoveringSidebar = signal(false);

  // Tracks whether the viewport is >= lg (1024px) — updated via matchMedia, no RxJS
  private readonly _mql = typeof window !== 'undefined' ? window.matchMedia('(min-width: 1024px)') : null;
  private readonly _isLargeScreen = signal(this._mql?.matches ?? true);

  // True when the sidebar is visually in icon-only mode (either user preference or responsive CSS)
  protected readonly isEffectivelyNarrow = computed(
    () => !this.isMobileOpen() && (!this._isLargeScreen() || this.isDrawerHalf()),
  );

  protected readonly pendingRoute = toSignal(
    this.router.events.pipe(
      filter((e) => e instanceof NavigationStart || e instanceof NavigationCancel || e instanceof NavigationError),
      map((e) => (e instanceof NavigationStart ? e.url : null)),
    ),
    { initialValue: null },
  );

  private readonly visibilitySignals = new Map<string, WritableSignal<boolean>>();

  protected readonly items = computed(() => {
    const role = this.auth.getUser()?.role;
    const allItems = this.sidebarSvc.getItems()();
    if (role === 'user') {
      return allItems.map((item) => {
        if (item.children) {
          return {
            ...item,
            children: item.children.filter((child) => !child.adminOnly),
          };
        }
        return item;
      });
    }
    return allItems;
  });

  constructor() {
    if (this._mql) {
      const handler = (e: MediaQueryListEvent) => this._isLargeScreen.set(e.matches);
      this._mql.addEventListener('change', handler);
      this.destroyRef.onDestroy(() => this._mql!.removeEventListener('change', handler));
    }

    effect(() => {
      const flatItems = this.flattenItems(this.items());
      for (const item of flatItems) {
        const key = item.name + (item.route ?? '');
        const visible = !item.hidden && !item.hiddenByFavourite;
        const existing = this.visibilitySignals.get(key);
        if (existing) {
          existing.set(visible);
        } else {
          this.visibilitySignals.set(key, signal(visible));
        }
      }
    });
  }

  protected closeMobile() {
    this.sidebarSvc.closeMobile();
  }

  private flattenItems(items: ISidebarItem[]): ISidebarItem[] {
    return items.flatMap((item) => (item.children ? [item, ...this.flattenItems(item.children)] : [item]));
  }

  protected getVisibilitySignal(item: ISidebarItem): WritableSignal<boolean> {
    const key = item.name + (item.route ?? '');
    return this.visibilitySignals.get(key) ?? signal(!item.hidden && !item.hiddenByFavourite);
  }

  protected isCollapsed(name: string): boolean {
    return this.sidebarSvc.isCollapsed(name);
  }

  protected isDrawerFull() {
    return this.sidebarSvc.isFull();
  }

  protected isDrawerHalf() {
    return this.sidebarSvc.isHalf();
  }

  protected isMobileOpen() {
    return this.sidebarSvc.isMobileOpen();
  }

  protected onSidebarHover(state: boolean) {
    this.hoveringSidebar.set(state);
  }

  protected toggleCollapse(name: string) {
    this.sidebarSvc.toggleCollapsed(name);
  }

  protected toggleDrawer() {
    return this.sidebarSvc.toggleDrawer();
  }
}
