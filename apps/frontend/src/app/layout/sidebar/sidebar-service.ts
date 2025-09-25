/**
 * Service responsible for managing sidebar items and drawer open state.
 */
import { Injectable } from "@angular/core";

import { ISidebarItem, SidebarItems } from "./sidebar-items";

@Injectable({
  providedIn: 'root',
})
/**
 * Provides utility methods for controlling the sidebar and retrieving its items.
 */
export class SidebarService {
  private readonly collapsedSections = new Set<string>();
  private readonly initializedSections = new Set<string>();

  private _isMobileOpen = false;
  private drawerState: DrawerStates = this.getState();
  private favourites = new Set<string>();
  private items = SidebarItems;

  constructor() {
    this.initializeCollapsedDefaults(this.items);
    this.loadFavourites();
  }

  /**
   * Indicates whether the drawer is open on mobile devices.
   */
  public get isMobileOpen() {
    return this._isMobileOpen;
  }

  /**
   * Closes the sidebar when viewed on mobile.
   */
  public closeMobile() {
    this._isMobileOpen = false;
  }

  public findItemForUrl(url: string): ISidebarItem | undefined {
    const normalizedUrl = this.normalizeRoute(url);
    const flatItems = this.flattenItems(this.items).filter((item) => !!item.route);

    return flatItems
      .sort((a, b) => this.normalizeRoute(b.route!).length - this.normalizeRoute(a.route!).length)
      .find((item) => this.matchesRoute(normalizedUrl, item.route!));
  }

  /**
   * Retrieves the current set of sidebar items.
   *
   * @returns Array of sidebar items.
   */
  public getItems() {
    return this.items;
  }

  /**
   * Retrieves a full route path that ends with the specified destination segment.
   *
   * This function searches through all sidebar items, including nested children,
   * to find the first route that matches the provided destination.
   *
   * @param destination - The last segment of the desired route (e.g., "tags", "people")
   * @returns The full route path if found (e.g., "/tags"); otherwise, undefined
   */
  public getRoute(destination: string): string | undefined {
    const allItems = this.flattenItems(this.items);
    const target = allItems.find((item) => item.route?.split('/').pop()?.toLowerCase() === destination.toLowerCase());
    return target?.route;
  }

  public isCollapsed(name: string) {
    return this.collapsedSections.has(name);
  }

  public isFavourite(route?: string) {
    if (!route) {
      return false;
    }

    return this.favourites.has(this.normalizeRoute(route));
  }

  /**
   * Checks if the drawer is fully expanded.
   *
   * @returns `true` when the drawer is open.
   */
  public isFull() {
    return this.drawerState === 'full';
  }

  /**
   * Determines if the drawer is half open, showing only icons.
   *
   * @returns `true` when the drawer is half expanded.
   */
  public isHalf() {
    return this.drawerState === 'half';
  }

  public setFavourite(route: string, favourite: boolean) {
    const normalizedRoute = this.normalizeRoute(route);

    if (!normalizedRoute) {
      return favourite;
    }

    if (favourite) {
      this.favourites.add(normalizedRoute);
    } else {
      this.favourites.delete(normalizedRoute);
    }

    this.updateItemFavourite(normalizedRoute, favourite);
    this.persistFavourites();
    this.rebuildFavouritesSection();

    return favourite;
  }

  /**
   * Replaces the sidebar items. Useful for updating badges or visibility.
   *
   * @param items - New array of sidebar items to use.
   */
  public setItems(items: ISidebarItem[]) {
    this.items = items;
    this.initializeCollapsedDefaults(items);
    this.applyFavouritesToItems(items);
  }

  public toggleCollapsed(name: string) {
    if (this.collapsedSections.has(name)) {
      this.collapsedSections.delete(name);
      return;
    }

    this.collapsedSections.add(name);
  }

  /**
   * Toggles the drawer state between full and half.
   *
   * @returns The updated drawer state.
   */
  public toggleDrawer() {
    return this.setState(this.drawerState === 'full' ? 'half' : 'full');
  }

  public toggleFavourite(route: string) {
    const next = !this.isFavourite(route);
    this.setFavourite(route, next);
    return next;
  }

  /**
   * Toggles the mobile drawer open or closed.
   */
  public toggleMobile() {
    this._isMobileOpen = !this._isMobileOpen;
  }

  private applyFavouritesToItems(items: ISidebarItem[]) {
    this.walkItems(items, (item) => {
      if (!item.route) {
        item.favourite = false;
        return;
      }

      item.favourite = this.favourites.has(this.normalizeRoute(item.route));
    });

    this.rebuildFavouritesSection();
  }

  private cloneForFavourite(item: ISidebarItem, parent: ISidebarItem): ISidebarItem {
    const { children, parent: _originalParent, ...rest } = item;

    return {
      ...rest,
      parent,
      children: undefined,
      hidden: false,
      type: 'item',
      favourite: true,
    };
  }

  /**
   * Recursively flattens a nested array of sidebar items into a single-level array.
   *
   * This includes all top-level items and their children.
   *
   * @param items - The array of sidebar items to flatten
   * @returns A flat array of sidebar items with no nested children
   */
  private flattenItems(items: ISidebarItem[]): ISidebarItem[] {
    return items.flatMap((item) => (item.children ? [item, ...this.flattenItems(item.children)] : [item]));
  }

  /**
   * Retrieves the current drawer state from local storage.
   *
   * @returns The persisted drawer state.
   */
  private getState(): DrawerStates {
    const state = localStorage.getItem(DRAWER_STATE_KEY);
    return state === 'full' ? 'full' : 'half';
  }

  private initializeCollapsedDefaults(items: ISidebarItem[]) {
    this.walkItems(items, (item) => {
      if (this.initializedSections.has(item.name)) {
        return;
      }

      this.initializedSections.add(item.name);

      if (item.collapsed) {
        this.collapsedSections.add(item.name);
      }
    });
  }

  private loadFavourites() {
    const raw = localStorage.getItem(SIDEBAR_FAVOURITES_KEY);

    if (raw) {
      try {
        const stored = JSON.parse(raw) as string[];
        this.favourites = new Set(stored.map((route) => this.normalizeRoute(route)).filter(Boolean));
      } catch {
        this.favourites.clear();
      }
    }

    this.applyFavouritesToItems(this.items);
  }

  private matchesRoute(url: string, route: string) {
    const normalizedRoute = this.normalizeRoute(route);

    if (normalizedRoute === '/') {
      return url === '/';
    }

    return url === normalizedRoute || url.startsWith(`${normalizedRoute}/`);
  }

  private normalizeRoute(route: string) {
    if (!route) {
      return '';
    }

    const [pathWithHash] = route.split('?');
    const path = pathWithHash.split('#')[0];
    const trimmed = path.endsWith('/') && path !== '/' ? path.slice(0, -1) : path;
    return trimmed || '/';
  }

  private persistFavourites() {
    localStorage.setItem(SIDEBAR_FAVOURITES_KEY, JSON.stringify([...this.favourites]));
  }

  private rebuildFavouritesSection() {
    const favouritesSection = this.items.find(
      (item) => item.type === 'subheading' && item.name === 'STARRED'
    );

    if (!favouritesSection) {
      return;
    }

    const favouriteRoutes = new Set(this.favourites);

    const favouriteItems = this.flattenItems(this.items)
      .filter((item) => item !== favouritesSection && item.parent !== favouritesSection)
      .filter((item) => !!item.route && favouriteRoutes.has(this.normalizeRoute(item.route!)))
      .map((item) => this.cloneForFavourite(item, favouritesSection));

    favouritesSection.children = favouriteItems;
    favouritesSection.hidden = favouriteItems.length === 0;
  }

  /**
   * Saves the drawer state to local storage so it can be restored on reload.
   *
   * @param state - Drawer state to persist.
   * @returns The stored drawer state.
   */
  private setState(state: DrawerStates) {
    this.drawerState = state;
    localStorage.setItem(DRAWER_STATE_KEY, this.drawerState);
    return this.drawerState;
  }

  private updateItemFavourite(route: string, favourite: boolean) {
    this.walkItems(this.items, (item) => {
      if (item.route && this.normalizeRoute(item.route) === route) {
        item.favourite = favourite;
      }
    });
  }

  private walkItems(items: ISidebarItem[], cb: (item: ISidebarItem) => void) {
    items.forEach((item) => {
      cb(item);

      if (item.children?.length) {
        this.walkItems(item.children, cb);
      }
    });
  }
}

type DrawerStates = 'full' | 'half';

const DRAWER_STATE_KEY = 'pc-drawerState';
const SIDEBAR_FAVOURITES_KEY = 'pc-sidebar-favourites';
