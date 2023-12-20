import { Injectable, signal } from "@angular/core";

export interface SidenavItem {
  name: string;
  code: string;
  icon?: string;
  route?: string;
  parent?: SidenavItem;
  subItems?: SidenavItem[];
  pathMatchExact?: boolean;
  badge?: string;
  hidden?: boolean; // hidden item, only shown to admins
  badgeColor?: string;
  type?: "item" | "subheading";
  customClass?: string;
  adminOnly?: boolean; // admin only item
}

@Injectable({
  providedIn: "root",
})
export class SidebarService {
  // Add all the sidebar items here. They go in the order they're added
  private _items = signal<SidenavItem[]>([
    {
      name: `Summary`,
      code: "summary",
      route: "/console/summary",
      icon: "home",
      pathMatchExact: true,
    },
    {
      name: `PEOPLE`,
      code: "peopleheading",
      type: "subheading",
    },
    {
      name: `People`,
      code: "people",
      route: "/console/people",
      icon: "identification",
    },
    {
      name: `Households`,
      code: "households",
      route: "/console/households",
      icon: "house-modern",
    },
    {
      name: "Canvassing",
      code: "canvassing",
      route: "/console/canvassing",
      icon: "map",
    },
    {
      name: "Map",
      code: "map",
      route: "/console/map",
      icon: "globe-americas",
    },
    {
      name: "Emails",
      code: "emails",
      route: "/console/emails",
      icon: "envelope",
    },
    {
      name: "Lists",
      code: "lists",
      route: "/console/lists",
      icon: "queue-list",
    },
    {
      name: "Tags",
      code: "tags",
      route: "/console/tags",
      icon: "hashtag",
    },
    {
      name: `TEAMS`,
      code: "teamsheading",
      type: "subheading",
    },
    {
      name: "Volunteers",
      code: "volunteers",
      route: "/console/volunteers",
      icon: "briefcase",
    },
    {
      name: "Teams",
      code: "teams",
      route: "/console/teams",
      icon: "user-group",
    },
    {
      name: "Donors",
      code: "donors",
      route: "/console/donors",
      icon: "banknotes",
    },
    {
      name: "Donations",
      code: "donations",
      route: "/console/donations",
      icon: "currency-dollar",
    },
    {
      name: `ADMIN`,
      code: "teamsheading",
      type: "subheading",
    },
    {
      name: "Export",
      code: "export",
      route: "/console/export",
      icon: "arrow-down-tray",
    },
    {
      name: "Forms",
      code: "forms",
      route: "/console/forms",
      icon: "clipboard-document-list",
    },
    {
      name: "Campaigns",
      code: "campaigns",
      route: "/console/campaigns",
      icon: "megaphone",
    },
    {
      name: "Users",
      code: "users",
      route: "/console/users",
      icon: "users",
    },
    {
      name: "Billing",
      code: "billing",
      route: "/console/billing",
      icon: "credit-card",
    },
    {
      name: "Settings",
      code: "settings",
      route: "/console/settings",
      icon: "cog-6-tooth",
    },
  ]);
  private _currentlyOpen = signal<SidenavItem | null>(null);

  constructor() {}

  get items() {
    return this._items();
  }

  set items(items: SidenavItem[]) {
    this._items.set(items);
  }

  get currentlyOpen(): SidenavItem | null {
    return this._currentlyOpen();
  }

  set currentlyOpen(currentlyOpen: SidenavItem) {
    this._currentlyOpen.set(currentlyOpen);
  }
}
