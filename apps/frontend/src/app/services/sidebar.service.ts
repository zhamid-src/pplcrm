import { Injectable } from '@angular/core';
import { IconName } from '@uxcommon/icons/icons.component';

type DrawerStates = 'full' | 'half';

export interface SidenavItem {
  adminOnly?: boolean;
  badge?: string;
  badgeColor?: string;
  code: string;
  customClass?: string;
  hidden?: boolean;
  icon?: IconName;
  name: string;
  parent?: SidenavItem;
  pathMatchExact?: boolean;
  route?: string;
  subItems?: SidenavItem[];
  type?: 'item' | 'subheading';

  // admin only item
}

@Injectable({
  providedIn: 'root',
})
export class SidebarService {
  private _drawerState: DrawerStates = this.getState();
  // Add all the sidebar items here. They go in the order they're added
  private _items: SidenavItem[] = [
    {
      name: `Summary`,
      code: 'summary',
      route: '/console/summary',
      icon: 'presentation-chart-line',
      pathMatchExact: true,
    },
    {
      name: `MyTasks`,
      code: 'mytasks',
      route: '/console/mytasks',
      icon: 'rectangle-stack',
    },
    {
      name: `PEOPLE`,
      code: 'peopleheading',
      type: 'subheading',
    },
    {
      name: `People`,
      code: 'people',
      route: '/console/people',
      icon: 'identification',
    },
    {
      name: `Households`,
      code: 'households',
      route: '/console/households',
      icon: 'house-modern',
    },
    {
      name: 'Emails',
      code: 'emails',
      route: '/console/emails',
      icon: 'envelope',
    },
    {
      name: 'Lists',
      code: 'lists',
      route: '/console/lists',
      icon: 'queue-list',
    },
    {
      name: 'Tags',
      code: 'tags',
      route: '/console/tags',
      icon: 'hashtag',
    },
    {
      name: `OUTREACH`,
      code: 'teamsheading',
      type: 'subheading',
    },
    {
      name: 'Campaigns',
      code: 'campaigns',
      route: '/console/campaigns',
      icon: 'megaphone',
    },
    {
      name: 'Canvassing',
      code: 'canvassing',
      route: '/console/canvassing',
      icon: 'map',
    },
    {
      name: 'Map',
      code: 'map',
      route: '/console/map',
      icon: 'globe-americas',
    },
    {
      name: `TEAMS`,
      code: 'teamsheading',
      type: 'subheading',
    },
    {
      name: 'Volunteers',
      code: 'volunteers',
      route: '/console/volunteers',
      icon: 'briefcase',
    },
    {
      name: 'Teams',
      code: 'teams',
      route: '/console/teams',
      icon: 'user-group',
    },
    {
      name: 'Donors',
      code: 'donors',
      route: '/console/donors',
      icon: 'banknotes',
    },
    {
      name: 'Donations',
      code: 'donations',
      route: '/console/donations',
      icon: 'currency-dollar',
    },
    {
      name: `ADMIN`,
      code: 'teamsheading',
      type: 'subheading',
    },
    {
      name: 'Export',
      code: 'export',
      route: '/console/export',
      icon: 'arrow-down-tray',
    },
    {
      name: `Tasks`,
      code: 'tasks',
      route: '/console/tasks',
      icon: 'square-3-stack-3d',
    },
    {
      name: 'Forms',
      code: 'forms',
      route: '/console/forms',
      icon: 'clipboard-document-list',
    },
    {
      name: 'Users',
      code: 'users',
      route: '/console/users',
      icon: 'users',
    },
    {
      name: 'Billing',
      code: 'billing',
      route: '/console/billing',
      icon: 'credit-card',
    },
    {
      name: 'Settings',
      code: 'settings',
      route: '/console/settings',
      icon: 'cog-6-tooth',
    },
  ];
  private _mobileOpen = false;

  public get items() {
    return this._items;
  }

  public set items(items: SidenavItem[]) {
    this._items = items;
  }

  public get mobileOpen() {
    return this._mobileOpen;
  }

  public closeMobile() {
    this._mobileOpen = false;
  }

  public findRoute(destination: string) {
    const target = this.items.find((item) => item.route?.endsWith(destination));
    return target?.route;
  }

  public isFull() {
    return this._drawerState === 'full';
  }

  public isHalf() {
    return this._drawerState === 'half';
  }

  public isMobileOpen() {
    return this._mobileOpen;
  }

  public setFull() {
    this.setState('full');
  }

  public setHalf() {
    this.setState('half');
  }

  public toggleDrawer() {
    return this.setState(this._drawerState === 'full' ? 'half' : 'full');
  }

  public toggleMobile() {
    this._mobileOpen = !this._mobileOpen;
  }

  private getState(): DrawerStates {
    const state = localStorage.getItem('pc-drawerState');
    return state === 'full' ? 'full' : 'half';
  }

  private setState(state: DrawerStates) {
    this._drawerState = state;
    localStorage.setItem('pc-drawerState', this._drawerState);
    return this._drawerState;
  }
}
