import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Icon } from '@uxcommon/icon';
import { Swap } from '@uxcommon/swap';

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
export class Sidebar {
  private readonly sidebarSvc = inject(SidebarService);

  protected readonly collapsedItems = new Set<string>();
  protected readonly router = inject(Router);

  public hoveringSidebar = false;

  protected get items() {
    return this.sidebarSvc.getItems();
  }

  protected closeMobile() {
    this.sidebarSvc.closeMobile();
  }

  protected isCollapsed(name: string): boolean {
    return this.collapsedItems.has(name);
  }

  protected isDrawerFull() {
    return this.sidebarSvc.isFull();
  }

  protected isDrawerHalf() {
    return this.sidebarSvc.isHalf();
  }

  protected isHoveringSidebar() {
    return this.hoveringSidebar;
  }

  protected isMobileOpen() {
    return this.sidebarSvc.isMobileOpen;
  }

  protected onSidebarHover(state: boolean) {
    this.hoveringSidebar = state;
  }

  protected toggleCollapse(name: string) {
    if (this.collapsedItems.has(name)) {
      this.collapsedItems.delete(name);
    } else {
      this.collapsedItems.add(name);
    }
  }

  protected toggleDrawer() {
    return this.sidebarSvc.toggleDrawer();
  }
}
