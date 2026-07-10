import { Component, computed, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { Alerts } from '@uxcommon/components/alerts/alerts';
import { Icon } from '@icons/icon';
import { AuthService } from '../../auth/auth-service';

import { Navbar } from '../navbar/navbar';
import { Sidebar } from '../sidebar/sidebar';
import { SidebarService } from 'apps/frontend/src/app/layout/sidebar/sidebar-service';
import { CommandPalette } from '../command-palette/command-palette';
import { KeyboardShortcutsHelp } from '../keyboard-shortcuts/keyboard-shortcuts-help';
import { KeyboardShortcutsService } from '../../services/keyboard-shortcuts.service';
import { BreadcrumbDefaultsService } from '../../services/breadcrumb-defaults.service';

@Component({
  selector: 'pc-dashboard',
  imports: [Navbar, Sidebar, RouterModule, Alerts, Icon, KeyboardShortcutsHelp, CommandPalette],
  templateUrl: './dashboard.html',
  host: {
    '(window:keydown)': 'onKeydown($event)',
  },
})
export class Dashboard {
  private readonly sidebarSvc = inject(SidebarService);
  private readonly auth = inject(AuthService);
  private readonly shortcuts = inject(KeyboardShortcutsService);

  protected readonly userSignal = this.auth.getUserSignal();
  protected readonly isViewer = computed(() => this.userSignal()?.role === 'viewer');

  constructor() {
    // Route-driven default breadcrumbs for every page the shell hosts.
    inject(BreadcrumbDefaultsService).start();
  }

  protected isMobileOpen() {
    return this.sidebarSvc.isMobileOpen();
  }

  protected onKeydown(event: KeyboardEvent): void {
    this.shortcuts.handleKeydown(event);
  }
}
