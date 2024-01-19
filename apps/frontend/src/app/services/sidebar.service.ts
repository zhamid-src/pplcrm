import { Injectable } from '@angular/core';
import { ISidebarItem, SidebarItems } from '../layout/sidebar.items';

type DrawerStates = 'full' | 'half';

@Injectable({
  providedIn: 'root',
})
export class SidebarService {
  private _drawerState: DrawerStates = this.getState();
  private _items = SidebarItems;
  private _mobileOpen = false;

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
    this._mobileOpen = false;
  }

  /**
   * Given the name of the final destination in the route, return the route
   *
   * Generally used by breadcrumb to navigate.
   *
   * @example - getRoute('persons') => '/console/persons'
   *
   * @param destination
   * @returns
   */
  public getRoute(destination: string) {
    const target = this.items.find((item) => item.route?.endsWith(destination));
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
    return this._mobileOpen;
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
    this._mobileOpen = !this._mobileOpen;
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
