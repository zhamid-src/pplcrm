import { Component, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { Alerts } from '@uxcommon/alert';
import { Breadcrumb } from '@uxcommon/breadcrumb';

import { Navbar } from './navbar';
import { Sidebar } from './sidebar';
import { SidebarService } from 'apps/frontend/src/app/layout/sidebar-service';

@Component({
  selector: 'pc-dashboard',
  imports: [Navbar, Sidebar, RouterModule, Breadcrumb, Alerts],
  templateUrl: './dashboard.html',
})
export class Dashboard {
  /**
   * Service that manages the sidebar visibility and toggling logic.
   */
  private readonly sidebarSvc = inject(SidebarService);

  /**
   * Returns whether the mobile sidebar is currently open.
   *
   * @returns `true` if the sidebar is open on mobile, otherwise `false`.
   */
  public isMobileOpen(): boolean {
    return this.sidebarSvc.isMobileOpen();
  }
}
