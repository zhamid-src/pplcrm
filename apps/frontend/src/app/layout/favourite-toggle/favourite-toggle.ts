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
        class="btn btn-circle btn-ghost btn-sm"
        [attr.aria-label]="favourite() ? 'Remove this page from favourites' : 'Add this page to favourites'"
        [title]="favourite() ? 'Remove from favourites' : 'Add to favourites'"
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

  protected readonly iconName = computed(() => {
    if (this.favourite()) return this.hovered() ? 'bookmark-slash' : 'bookmark-filled';
    return this.hovered() ? 'bookmark-plus' : 'bookmark';
  });

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
    this.currentItem = this.sidebarSvc.findItemForUrl(url);
    this.favourite.set(!!this.currentItem?.favourite);
    this.canToggleFavourite.set(!!this.currentItem?.route);
  }
}
