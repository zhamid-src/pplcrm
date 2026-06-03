/**
 * Sidebar component rendering navigation links and managing drawer state.
 */
import { Component, inject, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { Icon } from '@icons/icon';
import { Swap } from '@uxcommon/components/swap/swap';

import { SidebarService } from 'apps/frontend/src/app/layout/sidebar/sidebar-service';
import { AuthService } from 'apps/frontend/src/app/auth/auth-service';

@Component({
  selector: 'pc-sidebar',
  imports: [NgTemplateOutlet, Icon, RouterLink, Swap],
  templateUrl: './sidebar.html',
  styles: [
    `
      .tooltip:before {
        z-index: 100 !important;
      }
    `,
  ],
})
/**
 * Displays the navigation sidebar and delegates state management to SidebarService.
 */
export class Sidebar {
  private readonly sidebarSvc = inject(SidebarService);
  private readonly auth = inject(AuthService);

  protected readonly router = inject(Router);

  protected hoveringSidebar = signal(false);

  /**
   * List of sidebar items to render.
   *
   * @returns Array of configured sidebar items.
   */
  protected get items() {
    const role = this.auth.getUser()?.role;
    const allItems = this.sidebarSvc.getItems();
    if (role === 'user') {
      return allItems.map((item) => {
        if (item.children) {
          return {
            ...item,
            children: item.children.filter(
              (child) => child.name !== 'Users' && child.name !== 'Configuration' && child.name !== 'Billing',
            ),
          };
        }
        return item;
      });
    }
    return allItems;
  }

  /**
   * Closes the sidebar when viewed on mobile devices.
   */
  protected closeMobile() {
    this.sidebarSvc.closeMobile();
  }

  /**
   * Checks whether a sidebar section is collapsed.
   *
   * @param name - The section name to verify.
   * @returns `true` if the section is collapsed.
   */
  protected isCollapsed(name: string): boolean {
    return this.sidebarSvc.isCollapsed(name);
  }

  /**
   * Determines if the drawer is fully open.
   *
   * @returns `true` when drawer is fully expanded.
   */
  protected isDrawerFull() {
    return this.sidebarSvc.isFull();
  }

  /**
   * Determines if the drawer is half open, showing only icons.
   *
   * @returns `true` when drawer is half expanded.
   */
  protected isDrawerHalf() {
    return this.sidebarSvc.isHalf();
  }

  /**
   * Returns whether the sidebar is open in mobile view.
   */
  protected isMobileOpen() {
    return this.sidebarSvc.isMobileOpen();
  }

  /**
   * Sets hover state for the sidebar.
   *
   * @param state - `true` when the sidebar is being hovered.
   */
  protected onSidebarHover(state: boolean) {
    this.hoveringSidebar.set(state);
  }

  /**
   * Toggles the collapse state of a sidebar section.
   *
   * @param name - Name of the section to toggle.
   */
  protected toggleCollapse(name: string) {
    this.sidebarSvc.toggleCollapsed(name);
  }

  /**
   * Toggles the drawer between full and half states.
   */
  protected toggleDrawer() {
    return this.sidebarSvc.toggleDrawer();
  }
}
