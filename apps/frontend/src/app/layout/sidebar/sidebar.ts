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
  private sidebarSvc = inject(SidebarService);

  protected collapsedItems = new Set<string>();
  protected router = inject(Router);

  public hoveringSidebar = false;

  public get items() {
    return this.sidebarSvc.items;
  }

  public closeMobile() {
    this.sidebarSvc.closeMobile();
  }

  public isDrawerFull() {
    return this.sidebarSvc.isFull();
  }

  public isDrawerHalf() {
    return this.sidebarSvc.isHalf();
  }

  public isMobileOpen() {
    return this.sidebarSvc.isMobileOpen();
  }

  public onSidebarHover(state: boolean) {
    this.hoveringSidebar = state;
  }

  protected isHoveringSidebar() {
    return this.hoveringSidebar;
  }

  public toggleDrawer() {
    return this.sidebarSvc.toggleDrawer();
  }

  protected isCollapsed(name: string): boolean {
    return this.collapsedItems.has(name);
  }

  protected toggleCollapse(name: string) {
    if (this.collapsedItems.has(name)) {
      this.collapsedItems.delete(name);
    } else {
      this.collapsedItems.add(name);
    }
  }
}
