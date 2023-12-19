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
      icon: "users",
    },
    {
      name: "Volunteers",
      code: "volunteers",
      route: "/console/volunteers",
      icon: "briefcase",
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
