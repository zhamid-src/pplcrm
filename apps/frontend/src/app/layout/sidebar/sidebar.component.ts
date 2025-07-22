import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { SidebarService } from '@services/sidebar.service';
import { IconsComponent } from '@uxcommon/icons/icons.component';
import { SwapComponent } from '@uxcommon/swap/swap.component';

@Component({
  selector: 'pc-sidebar',
  imports: [IconsComponent, RouterLink, SwapComponent],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css',
})
export class SidebarComponent {
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
