import { Component, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { SidebarService } from 'apps/frontend/src/app/layout/sidebar-service';
import { Alert } from '@uxcommon/alert';
import { Breadcrumb } from '@uxcommon/breadcrumb';
import { Navbar } from './navbar';
import { Sidebar } from './sidebar';

@Component({
  selector: 'pc-dashboard',
  imports: [Navbar, Sidebar, RouterModule, Breadcrumb, Alert],
  templateUrl: './dashboard.html',
})
export class Dashboard {
  private sidebarSvc = inject(SidebarService);

  public isMobileOpen() {
    return this.sidebarSvc.isMobileOpen();
  }
}
