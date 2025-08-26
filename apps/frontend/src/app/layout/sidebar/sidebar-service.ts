/**
 * Service responsible for managing sidebar items and drawer open state.
 */
import { Injectable } from '@angular/core';

import { ISidebarItem, SidebarItems } from './sidebar-items';

@Injectable({
  providedIn: 'root',
})
/**
 * Provides utility methods for controlling the sidebar and retrieving its items.
 */
export class SidebarService {
  private _isMobileOpen = false;
  private drawerState: DrawerStates = this.getState();
  private items = SidebarItems;

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

  /**
   * Replaces the sidebar items. Useful for updating badges or visibility.
   *
   * @param items - New array of sidebar items to use.
   */
  public setItems(items: ISidebarItem[]) {
    this.items = items;
  }

  /**
   * Toggles the drawer state between full and half.
   *
   * @returns The updated drawer state.
   */
  public toggleDrawer() {
    return this.setState(this.drawerState === 'full' ? 'half' : 'full');
  }

  /**
   * Toggles the mobile drawer open or closed.
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
   * Retrieves the current drawer state from local storage.
   *
   * @returns The persisted drawer state.
   */
  private getState(): DrawerStates {
    const state = localStorage.getItem('pc-drawerState');
    return state === 'full' ? 'full' : 'half';
  }

  /**
   * Saves the drawer state to local storage so it can be restored on reload.
   *
   * @param state - Drawer state to persist.
   * @returns The stored drawer state.
   */
  private setState(state: DrawerStates) {
    this.drawerState = state;
    localStorage.setItem('pc-drawerState', this.drawerState);
    return this.drawerState;
  }
}

type DrawerStates = 'full' | 'half';
