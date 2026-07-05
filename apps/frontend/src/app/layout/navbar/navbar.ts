import { Component, ElementRef, OnDestroy, effect, inject, signal, viewChild, computed } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { Icon } from '@icons/icon';
import { Swap } from '@uxcommon/components/swap/swap';
import { AnimateIfDirective } from '@uxcommon/directives/animate-if.directive';
import { Router, RouterLink } from '@angular/router';

import { FavouriteToggle } from '../favourite-toggle/favourite-toggle';
import { SearchService } from '../../services/api/search-service';
import { FullScreenService } from '../../services/fullscreen.service';
import { AuthService } from 'apps/frontend/src/app/auth/auth-service';
import { SidebarService } from 'apps/frontend/src/app/layout/sidebar/sidebar-service';
import { ThemeService } from 'apps/frontend/src/app/layout/theme/theme-service';
import { UserService } from '@frontend/services/user.service';
import { EmailActionsStore } from '../../experiences/emails/services/store/email-actions.store';
import { NotificationsService } from '../../services/api/notifications-service';

type NotificationItem = {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  link: string | null;
  created_at: string | Date;
};

@Component({
  selector: 'pc-navbar',
  imports: [Icon, Swap, ReactiveFormsModule, AnimateIfDirective, RouterLink, FavouriteToggle],
  templateUrl: './navbar.html',
  host: {
    '(window:keydown)': 'handleKeyDown($event)',
  },
})
export class Navbar implements OnDestroy {
  protected readonly emailActions = inject(EmailActionsStore);
  private readonly auth = inject(AuthService);
  private readonly userService = inject(UserService);
  private readonly fullscreen = inject(FullScreenService);
  private readonly searchSvc = inject(SearchService);
  private readonly sideBarSvc = inject(SidebarService);
  private readonly notificationsSvc = inject(NotificationsService);
  private readonly router = inject(Router);

  protected readonly currentUser = this.auth.getUserSignal();
  protected readonly currentUserAvatar = computed(() => {
    const user = this.currentUser();
    return user ? this.userService.resolveAvatarUrl(user.avatar_url) : null;
  });

  private pollInterval?: ReturnType<typeof setInterval>;

  public readonly notifications = signal<NotificationItem[]>([]);
  public readonly unreadCount = signal<number>(0);
  public readonly isLoadingMore = signal<boolean>(false);
  public readonly hasMore = signal<boolean>(true);
  public readonly isPulsing = signal<boolean>(false);

  protected isMobileOpen() {
    return this.sideBarSvc.isMobileOpen();
  }
  protected readonly searchBarVisible = signal(false);

  protected readonly searchStr = signal('');
  protected readonly themeSvc = inject(ThemeService);

  public readonly searchInputRef = viewChild<ElementRef<HTMLInputElement>>('searchInput');

  constructor() {
    // Move focus to the search bar whenever it becomes visible
    effect(() => {
      if (this.searchBarVisible())
        queueMicrotask(() => {
          this.searchInputRef()?.nativeElement?.focus();
        });
    });

    void this.initNotifications();
    this.pollInterval = setInterval(() => {
      void this.refreshCount();
    }, 60000);
  }

  public ngOnDestroy() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
    }
  }

  private async initNotifications() {
    try {
      const count = await this.notificationsSvc.getUnreadCount();
      this.unreadCount.set(count || 0);
      if (count && count > 0) {
        this.isPulsing.set(true);
      }
      await this.fetchInitial();
    } catch (err) {
      console.error('Failed to initialize notifications', err);
    }
  }

  protected async fetchInitial() {
    this.isLoadingMore.set(true);
    try {
      const list = await this.notificationsSvc.getLatest({ limit: 5, offset: 0 });
      this.notifications.set(list || []);
      this.hasMore.set((list || []).length === 5);
    } catch (err) {
      console.error('Failed to fetch initial notifications', err);
    } finally {
      this.isLoadingMore.set(false);
    }
  }

  protected async refreshCount() {
    try {
      const count = await this.notificationsSvc.getUnreadCount();
      const oldCount = this.unreadCount();
      this.unreadCount.set(count || 0);
      if (count > oldCount) {
        this.isPulsing.set(true);
        // Notification count increased, fetch first 5 notifications in background
        await this.fetchInitial();
      }
    } catch (err) {
      console.error('Failed to poll notification count', err);
    }
  }

  protected onNotificationOpen() {
    this.isPulsing.set(false);
    if (this.notifications().length === 0) {
      void this.fetchInitial();
    }
  }

  protected onScroll(event: Event) {
    const target = event.target as HTMLElement;
    const threshold = 20; // px from bottom
    const isNearBottom = target.scrollHeight - target.scrollTop - target.clientHeight < threshold;
    if (isNearBottom) {
      void this.loadMore();
    }
  }

  protected async loadMore() {
    if (this.isLoadingMore() || !this.hasMore()) return;
    this.isLoadingMore.set(true);
    try {
      const nextBatch = await this.notificationsSvc.getLatest({
        limit: 5,
        offset: this.notifications().length,
      });
      if (!nextBatch || nextBatch.length < 5) {
        this.hasMore.set(false);
      }
      if (nextBatch && nextBatch.length > 0) {
        const existingIds = new Set(this.notifications().map((n) => n.id));
        const uniqueNext = nextBatch.filter((n: NotificationItem) => !existingIds.has(n.id));
        if (uniqueNext.length > 0) {
          this.notifications.set([...this.notifications(), ...uniqueNext]);
        }
      }
    } catch (err) {
      console.error('Failed to load more notifications', err);
    } finally {
      this.isLoadingMore.set(false);
    }
  }

  protected async clickNotification(notif: NotificationItem) {
    if (!notif.read) {
      try {
        await this.notificationsSvc.markRead(notif.id);
        this.notifications.update((list) => list.map((n) => (n.id === notif.id ? { ...n, read: true } : n)));
        this.unreadCount.update((c) => Math.max(0, c - 1));
      } catch (err) {
        console.error('Failed to mark notification read', err);
      }
    }
    if (notif.link) {
      void this.router.navigateByUrl(notif.link);
    }
    this.closeDropdown();
  }

  protected async markAllAsRead(event: Event) {
    event.stopPropagation();
    try {
      await this.notificationsSvc.markAllRead();
      this.notifications.update((list) => list.map((n) => ({ ...n, read: true })));
      this.unreadCount.set(0);
    } catch (err) {
      console.error('Failed to mark all read', err);
    }
  }

  protected formatTime(dateStr: string | Date | null | undefined): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }

  public clearSearch(): void {
    this.searchStr.set('');
    this.searchSvc.clearSearch();
  }

  public handleKeyDown(event: KeyboardEvent): void {
    const isCtrlOrCmd = event.ctrlKey || event.metaKey;
    const isK = event?.key?.toLowerCase() === 'k';

    // ⌘K opens inline search; ⌘⇧K is reserved for the command palette (handled there).
    if (isCtrlOrCmd && isK && !event.shiftKey) {
      event.preventDefault();

      this.showSearchBar();
    } else if (event.key === 'Escape' && this.searchBarVisible()) {
      this.clearSearch();
      this.hideSearchBar();
    }
  }

  protected hideSearchBar(): void {
    this.searchBarVisible.set(false);
  }

  protected isFullScreenMode(): boolean {
    return this.fullscreen.isFullScreenMode();
  }

  protected onBlurSearchBar() {
    if (!this.searchStr().length) {
      this.hideSearchBar();
    }
  }

  protected onSearchEnter(): void {
    this.searchSvc.doSearchImmediate(this.searchStr());
  }

  protected onSearchInput(event: Event) {
    const input = event.target as HTMLInputElement;
    this.searchStr.set(input.value);
    this.search();
  }

  protected search(): void {
    this.searchSvc.doSearch(this.searchStr());
  }

  protected showSearchBar(): void {
    this.searchBarVisible.set(true);
  }

  protected signOut(): void {
    void this.auth.signOut();
  }

  protected closeDropdown(): void {
    const activeEl = document.activeElement as HTMLElement | null;
    if (activeEl) {
      activeEl.blur();
    }
  }

  protected toggleFullScreen(): void {
    void this.fullscreen.toggleFullScreen();
  }

  protected toggleMobile(): void {
    this.sideBarSvc.toggleMobile();
  }

  protected toggleSearch(): void {
    this.searchBarVisible.set(!this.searchBarVisible());
  }

  protected toggleTheme(): void {
    this.themeSvc.toggleTheme();
  }
}
