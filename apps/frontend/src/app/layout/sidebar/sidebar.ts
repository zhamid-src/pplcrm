import { Component, inject, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { Icon } from '@icons/icon';
import { Swap } from '@uxcommon/components/swap/swap';

import { SidebarService } from 'apps/frontend/src/app/layout/sidebar/sidebar-service';
import { AuthService } from 'apps/frontend/src/app/auth/auth-service';
import { ISidebarItem } from './sidebar-items';
import { AnimateIfDirective } from '@uxcommon/directives/animate-if.directive';

@Component({
  selector: 'pc-sidebar',
  imports: [NgTemplateOutlet, Icon, RouterLink, Swap, AnimateIfDirective],
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
  private readonly auth = inject(AuthService);

  protected readonly router = inject(Router);

  protected hoveringSidebar = signal(false);

  protected get items() {
    const role = this.auth.getUser()?.role;
    const allItems = this.sidebarSvc.getItems()();
    if (role === 'user') {
      return allItems.map((item) => {
        if (item.children) {
          return {
            ...item,
            children: item.children.filter((child) => !child.adminOnly),
          };
        }
        return item;
      });
    }
    return allItems;
  }

  protected closeMobile() {
    this.sidebarSvc.closeMobile();
  }

  // return a signal indicating whether the item should be visible or not as indicated by !nav.hidden && !nav.hiddenByFavourite
  protected getVisibilitySignal(item: ISidebarItem) {
    return signal(!item.hidden && !item.hiddenByFavourite);
  }

  protected isCollapsed(name: string): boolean {
    return this.sidebarSvc.isCollapsed(name);
  }

  protected isDrawerFull() {
    return this.sidebarSvc.isFull();
  }

  protected isDrawerHalf() {
    return this.sidebarSvc.isHalf();
  }

  protected isMobileOpen() {
    return this.sidebarSvc.isMobileOpen();
  }

  protected onSidebarHover(state: boolean) {
    this.hoveringSidebar.set(state);
  }

  protected toggleCollapse(name: string) {
    this.sidebarSvc.toggleCollapsed(name);
  }

  protected toggleDrawer() {
    return this.sidebarSvc.toggleDrawer();
  }
}
