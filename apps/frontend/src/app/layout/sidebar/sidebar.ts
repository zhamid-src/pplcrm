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
import { DuplicatesService } from '@experiences/duplicates/services/duplicates-service';
import { ISidebarItem } from './sidebar-items';
import { AnimateIfDirective } from '@uxcommon/directives/animate-if.directive';
import { TasksService } from '@experiences/tasks/services/tasks-service';

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
  private readonly tasksSvc = inject(TasksService);
  private readonly duplicatesSvc = inject(DuplicatesService);

  /** Live SLA-breach count for the Tasks sidebar badge (spec §4). Loads once per session;
   *  a failed fetch just leaves the badge unset rather than showing a stale/fake number. */
  protected readonly taskSlaBreaches = signal<number | null>(null);

  /** Live merge-queue size for the Duplicates sidebar badge (spec §9.3). Same one-shot-per-
   *  session loading shape as `taskSlaBreaches` above. */
  protected readonly duplicatesQueueCount = signal<number | null>(null);

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
    const withBadges = this.applyBadges(allItems);
    if (role === 'user') {
      return withBadges.map((item) => {
        if (item.children) {
          return {
            ...item,
            children: item.children.filter((child) => !child.adminOnly),
          };
        }
        return item;
      });
    }
    return withBadges;
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
        const key = this.getItemKey(item);
        const visible = !item.hidden && !item.hiddenByFavourite;
        const existing = this.visibilitySignals.get(key);
        if (existing) {
          existing.set(visible);
        } else {
          this.visibilitySignals.set(key, signal(visible));
        }
      }
    });

    void this.loadTaskSlaBreaches();
    void this.loadDuplicatesQueueCount();
  }

  private async loadTaskSlaBreaches(): Promise<void> {
    try {
      this.taskSlaBreaches.set(await this.tasksSvc.countSlaBreaches());
    } catch {
      // Badge just stays unset — never show a stale or fabricated count.
    }
  }

  /** Duplicates badge = merge-queue size (spec §9.3). One fetch per session — the queue only
   *  meaningfully changes after a nightly sweep or a merge, so it isn't polled. */
  private async loadDuplicatesQueueCount(): Promise<void> {
    try {
      this.duplicatesQueueCount.set(await this.duplicatesSvc.countQueue());
    } catch {
      // Badge just stays unset — never show a stale or fabricated count.
    }
  }

  /** Stamps the live `badgeCount` onto the Tasks and Duplicates entries — every other item is
   *  untouched. */
  private applyBadges(items: ISidebarItem[]): ISidebarItem[] {
    const breaches = this.taskSlaBreaches();
    const duplicatesQueue = this.duplicatesQueueCount();
    return items.map((item) => {
      const children = item.children ? this.applyBadges(item.children) : undefined;
      if (item.route === '/tasks') {
        return { ...item, ...(children ? { children } : {}), badgeCount: breaches };
      }
      if (item.route === '/duplicates') {
        return { ...item, ...(children ? { children } : {}), badgeCount: duplicatesQueue };
      }
      return children ? { ...item, children } : item;
    });
  }

  protected closeMobile() {
    this.sidebarSvc.closeMobile();
  }

  private flattenItems(items: ISidebarItem[]): ISidebarItem[] {
    return items.flatMap((item) => (item.children ? [item, ...this.flattenItems(item.children)] : [item]));
  }

  private getItemKey(item: ISidebarItem): string {
    const prefix = item.parent?.type === 'bookmark' ? 'bookmark:' : '';
    return prefix + item.name + (item.route ?? '');
  }

  protected getVisibilitySignal(item: ISidebarItem): WritableSignal<boolean> {
    const key = this.getItemKey(item);
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

  protected toggleCollapse(name: string) {
    this.sidebarSvc.toggleCollapsed(name);
  }

  protected toggleDrawer() {
    return this.sidebarSvc.toggleDrawer();
  }
}
