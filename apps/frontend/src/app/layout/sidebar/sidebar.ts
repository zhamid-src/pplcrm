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
  private _sidebarSvc = inject(SidebarService);

  protected collapsedItems = new Set<string>();
  protected router = inject(Router);

  public hoveringSidebar = false;

  public get items() {
    return this._sidebarSvc.items;
  }

  public closeMobile() {
    this._sidebarSvc.closeMobile();
  }

  public isDrawerFull() {
    return this._sidebarSvc.isFull();
  }

  public isDrawerHalf() {
    return this._sidebarSvc.isHalf();
  }

  public isMobileOpen() {
    return this._sidebarSvc.isMobileOpen();
  }

  public onSidebarHover(state: boolean) {
    this.hoveringSidebar = state;
  }

  protected isHoveringSidebar() {
    return this.hoveringSidebar;
  }

  public toggleDrawer() {
    return this._sidebarSvc.toggleDrawer();
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
