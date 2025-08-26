/**
 * Sidebar component rendering navigation links and managing drawer state.
 */
import { Component, OnInit, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Icon } from '@icons/icon';
import { Swap } from '@uxcommon/swap/swap';

import { SidebarService } from 'apps/frontend/src/app/layout/sidebar/sidebar-service';

@Component({
  selector: 'pc-sidebar',
  imports: [Icon, RouterLink, Swap],
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
export class Sidebar implements OnInit {
  private readonly sidebarSvc = inject(SidebarService);

  protected readonly collapsedItems = new Set<string>();
  protected readonly router = inject(Router);

  public hoveringSidebar = false;

  /**
   * List of sidebar items to render.
   *
   * @returns Array of configured sidebar items.
   */
  protected get items() {
    return this.sidebarSvc.getItems();
  }

  public ngOnInit() {
    const items = this.items;

    items.forEach((item) => {
      if (item.collapsed) {
        this.collapsedItems.add(item.name);
      }
    });
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
    return this.collapsedItems.has(name);
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
   * Indicates whether the mouse is hovering over the sidebar.
   *
   * @returns Hovering state of the sidebar.
   */
  protected isHoveringSidebar() {
    return this.hoveringSidebar;
  }

  /**
   * Returns whether the sidebar is open in mobile view.
   */
  protected isMobileOpen() {
    return this.sidebarSvc.isMobileOpen;
  }

  /**
   * Sets hover state for the sidebar.
   *
   * @param state - `true` when the sidebar is being hovered.
   */
  protected onSidebarHover(state: boolean) {
    this.hoveringSidebar = state;
  }

  /**
   * Toggles the collapse state of a sidebar section.
   *
   * @param name - Name of the section to toggle.
   */
  protected toggleCollapse(name: string) {
    if (this.collapsedItems.has(name)) {
      this.collapsedItems.delete(name);
    } else {
      this.collapsedItems.add(name);
    }
  }

  /**
   * Toggles the drawer between full and half states.
   */
  protected toggleDrawer() {
    return this.sidebarSvc.toggleDrawer();
  }
}
