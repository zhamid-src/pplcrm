import { Component, computed, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { Alerts } from '@uxcommon/components/alerts/alerts';
import { Icon } from '@icons/icon';
import { AuthService } from '../../auth/auth-service';

import { Navbar } from '../navbar/navbar';
import { Sidebar } from '../sidebar/sidebar';
import { SidebarService } from 'apps/frontend/src/app/layout/sidebar/sidebar-service';

@Component({
  selector: 'pc-dashboard',
  imports: [Navbar, Sidebar, RouterModule, Alerts, Icon],
  templateUrl: './dashboard.html',
})
export class Dashboard {
  private readonly sidebarSvc = inject(SidebarService);
  private readonly auth = inject(AuthService);

  protected readonly userSignal = this.auth.getUserSignal();
  protected readonly isViewer = computed(() => this.userSignal()?.role === 'viewer');

  protected isMobileOpen() {
    return this.sidebarSvc.isMobileOpen();
  }
}
