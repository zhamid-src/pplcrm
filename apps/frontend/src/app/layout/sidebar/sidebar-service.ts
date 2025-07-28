import { Injectable } from "@angular/core";

import { ISidebarItem, SidebarItems } from "./sidebar-items";

@Injectable({
  providedIn: 'root',
})
export class SidebarService {
  private _drawerState: DrawerStates = this.getState();
  private _isMobileOpen = false;
  private _items = SidebarItems;

  /**
   * Get all the sidebar items.
   */
  public get items() {
    return this._items;
  }

  /**
   * Set all the sidebar items. Typically it'll be used to update the sidebar,
   * for instance by adding badges to the sidebar items.
   */
  public set items(items: ISidebarItem[]) {
    this._items = items;
  }

  /**
   * Close the sidebar on mobile
   */
  public closeMobile() {
    this._isMobileOpen = false;
  }

  /**
   * Retrieves a full route path that ends with the specified destination segment.
   *
   * This function searches through all sidebar items, including nested children,
   * to find the first route that matches the provided destination.
   *
   * @param destination - The last segment of the desired route (e.g., "tags", "people")
   * @returns The full route path if found (e.g., "/console/tags"); otherwise, undefined
   */
  public getRoute(destination: string): string | undefined {
    const allItems = this.flattenItems(this.items);
    const target = allItems.find((item) => item.route?.split('/').pop()?.toLowerCase() === destination.toLowerCase());
    return target?.route;
  }

  /**
   * Is the drawer fully open
   */
  public isFull() {
    return this._drawerState === 'full';
  }

  /**
   * is the drawer half open, showing only the icons
   */
  public isHalf() {
    return this._drawerState === 'half';
  }

  /**
   * Is the drawer open on mobile
   */
  public isMobileOpen() {
    return this._isMobileOpen;
  }

  /**
   * Togger the drawer state between full and half
   */
  public toggleDrawer() {
    return this.setState(this._drawerState === 'full' ? 'half' : 'full');
  }

  /**
   * Toggle the drawer on mobile
   */
  public toggleMobile() {
    this._isMobileOpen = !this._isMobileOpen;
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
   * Get the currrent drawer state (full or half)
   */
  private getState(): DrawerStates {
    const state = localStorage.getItem('pc-drawerState');
    return state === 'full' ? 'full' : 'half';
  }

  /**
   * Save the drawer state so that it can be restored on page reload
   *
   */
  private setState(state: DrawerStates) {
    this._drawerState = state;
    localStorage.setItem('pc-drawerState', this._drawerState);
    return this._drawerState;
  }
}

type DrawerStates = 'full' | 'half';
