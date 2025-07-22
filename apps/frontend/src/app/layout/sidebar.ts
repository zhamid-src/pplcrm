import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { SidebarService } from 'apps/frontend/src/app/layout/sidebar-service';
import { IconsComponent } from '@uxcommon/icons.component';
import { Swap } from '@uxcommon/swap';

@Component({
  selector: 'pc-sidebar',
  imports: [IconsComponent, RouterLink, Swap],
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
  protected router = inject(Router);

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

  public toggleDrawer() {
    return this.sidebarSvc.toggleDrawer();
  }
}
