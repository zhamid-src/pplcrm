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
  private readonly sidebarSvc = inject(SidebarService);

  protected readonly isMobileOpen = this.sidebarSvc.isMobileOpen;
}
