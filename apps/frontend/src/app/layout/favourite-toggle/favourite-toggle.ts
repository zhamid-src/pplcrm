import { Component, computed, effect, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

import { Icon } from '@icons/icon';
import { ISidebarItem } from '../sidebar/sidebar-items';
import { SidebarService } from '../sidebar/sidebar-service';

/**
 * Bookmark button for the navbar: favourites the sidebar item matching the
 * current route. Extracted from the retired URL-segment breadcrumb bar; page
 * orientation is now handled by pc-breadcrumbs inside each page header.
 */
@Component({
  selector: 'pc-favourite-toggle',
  imports: [Icon],
  template: `
    @if (canToggleFavourite()) {
      <button
        type="button"
        class="btn btn-circle btn-ghost btn-sm tooltip tooltip-bottom"
        [attr.aria-label]="tooltip()"
        [attr.data-tip]="tooltip()"
        (mouseenter)="hovered.set(true)"
        (mouseleave)="hovered.set(false)"
        (click)="toggleFavourite()"
      >
        <pc-icon
          [name]="iconName()"
          [size]="5"
          class="text-base-400 hover:text-primary"
          [class.text-primary]="favourite()"
        ></pc-icon>
      </button>
    }
  `,
})
export class FavouriteToggle {
  private readonly router = inject(Router);
  private readonly sidebarSvc = inject(SidebarService);

  private readonly navigationUrl = computed(() => {
    const navigation = this.router.currentNavigation();
    if (navigation) {
      const finalUrl = navigation.finalUrl ?? navigation.initialUrl;
      return finalUrl.toString();
    }
    return this.router.url;
  });

  private currentItem?: ISidebarItem;
  protected readonly favourite = signal(false);
  protected readonly hovered = signal(false);
  protected readonly canToggleFavourite = signal(false);
  protected readonly itemName = signal('');

  protected readonly iconName = computed(() => {
    if (this.favourite()) return this.hovered() ? 'bookmark-slash' : 'bookmark-filled';
    return this.hovered() ? 'bookmark-plus' : 'bookmark';
  });

  protected readonly tooltip = computed(() =>
    this.favourite()
      ? `Remove '${this.itemName()}' from sidebar bookmarks`
      : `Bookmark '${this.itemName()}' in the sidebar`,
  );

  constructor() {
    effect(() => this.handleNavigationChange(this.navigationUrl()));
  }

  protected toggleFavourite(): void {
    if (!this.currentItem?.route) {
      return;
    }
    const next = this.sidebarSvc.toggleFavourite(this.currentItem.route);
    this.favourite.set(next);
    this.currentItem.favourite = next;
  }

  private handleNavigationChange(url: string): void {
    const item = this.sidebarSvc.findItemForUrl(url);
    // Sidebar bookmarks hold sections, not records. The service matches by
    // prefix, so on a record page (/people/123) the star would read as
    // "bookmark this person" while actually bookmarking People — only offer
    // the toggle when the URL is the sidebar item's own page.
    const exact = !!item?.route && this.normalizePath(url) === this.normalizePath(item.route);
    this.currentItem = exact ? item : undefined;
    this.favourite.set(exact && !!item?.favourite);
    this.canToggleFavourite.set(exact);
    this.itemName.set(exact ? (item?.name ?? '') : '');
  }

  private normalizePath(route: string): string {
    const path = (route.split('?')[0] ?? '').split('#')[0] ?? '';
    const trimmed = path.endsWith('/') && path !== '/' ? path.slice(0, -1) : path;
    return trimmed || '/';
  }
}
