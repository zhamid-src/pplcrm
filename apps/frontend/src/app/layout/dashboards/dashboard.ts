/**
 * Root dashboard component that composes the main layout by combining the
 * navbar, sidebar, and routed content area.
 */
import { Component, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { Alerts } from '@uxcommon/components/alerts/alerts';
import { Breadcrumb } from '@uxcommon/components/breadcrumb/breadcrumb';

import { Navbar } from '../navbar/navbar';
import { Sidebar } from '../sidebar/sidebar';
import { SidebarService } from 'apps/frontend/src/app/layout/sidebar/sidebar-service';

@Component({
  selector: 'pc-dashboard',
  imports: [Navbar, Sidebar, RouterModule, Breadcrumb, Alerts],
  templateUrl: './dashboard.html',
})
/**
 * Container component used as the shell for dashboard pages.
 */
export class Dashboard {
  /**
   * Service that manages the sidebar visibility and toggling logic.
   */
  private readonly sidebarSvc = inject(SidebarService);

  /**
   * Indicates whether the sidebar is open in mobile view.
   *
   * @returns `true` if the sidebar is open on mobile, otherwise `false`.
   */
  protected isMobileOpen() {
    return this.sidebarSvc.isMobileOpen;
  }
}
