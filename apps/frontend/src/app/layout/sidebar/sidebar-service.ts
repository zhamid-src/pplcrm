import { signal, Service } from '@angular/core';
import { ISidebarItem, SidebarItems } from './sidebar-items';

@Service()
export class SidebarService {
  private readonly collapsedSections = new Set<string>();
  private readonly initializedSections = new Set<string>();

  private readonly drawerStateSubject = signal<DrawerStates>(this.getState());
  private readonly isMobileOpenSubject = signal<boolean>(false);
  private favourites = new Set<string>();
  private readonly itemsSignal = signal<ISidebarItem[]>(SidebarItems);
  private get items() {
    return this.itemsSignal();
  }
  private set items(value: ISidebarItem[]) {
    this.itemsSignal.set(value);
  }

  constructor() {
    this.initializeCollapsedDefaults(this.items);
    this.loadFavourites();
  }

  public closeMobile() {
    this.isMobileOpenSubject.set(false);
  }

  public findItemForUrl(url: string): ISidebarItem | undefined {
    const normalizedUrl = this.normalizeRoute(url);
    const flatItems = this.flattenItems(this.items).filter((item) => !!item.route);

    return flatItems
      .sort((a, b) => this.normalizeRoute(b.route!).length - this.normalizeRoute(a.route!).length)
      .find((item) => this.matchesRoute(normalizedUrl, item.route!));
  }

  public getItems() {
    return this.itemsSignal;
  }

  public getRoute(destination: string): string | undefined {
    const allItems = this.flattenItems(this.items);
    const target = allItems.find((item) => item.route?.split('/').pop()?.toLowerCase() === destination.toLowerCase());
    return target?.route;
  }

  public isFull() {
    return this.drawerStateSubject() === 'full';
  }

  public isHalf() {
    return this.drawerStateSubject() === 'half';
  }

  public isMobileOpen() {
    return this.isMobileOpenSubject();
  }

  public isCollapsed(name: string) {
    return this.collapsedSections.has(name);
  }

  public isFavourite(route?: string) {
    if (!route) return false;
    return this.favourites.has(this.normalizeRoute(route));
  }

  public setFavourite(route: string, favourite: boolean) {
    const normalizedRoute = this.normalizeRoute(route);

    if (!normalizedRoute) return favourite;

    if (favourite) {
      this.favourites.add(normalizedRoute);
    } else {
      this.favourites.delete(normalizedRoute);
    }

    this.updateItemFavourite(normalizedRoute, favourite);
    this.persistFavourites();
    this.rebuildFavouritesSection();

    return favourite;
  }

  public setItems(items: ISidebarItem[]) {
    this.items = items;
    this.initializeCollapsedDefaults(items);
    this.applyFavouritesToItems(items);
  }

  public toggleCollapsed(name: string) {
    if (this.collapsedSections.has(name)) {
      this.collapsedSections.delete(name);
      return;
    }
    this.collapsedSections.add(name);
  }

  public toggleDrawer() {
    const next = this.drawerStateSubject() === 'full' ? 'half' : 'full';
    return this.setState(next);
  }

  public toggleFavourite(route: string) {
    const next = !this.isFavourite(route);
    this.setFavourite(route, next);
    return next;
  }

  public toggleMobile() {
    this.isMobileOpenSubject.update((v) => !v);
  }

  private applyFavouritesToItems(items: ISidebarItem[]) {
    this.walkItems(items, (item) => {
      if (item.type === 'bookmark' || item.parent?.type === 'bookmark') {
        return;
      }

      if (!item.route) {
        item.favourite = false;
        return;
      }

      const isFavourited = this.favourites.has(this.normalizeRoute(item.route));
      item.favourite = isFavourited;
      item.hiddenByFavourite = isFavourited; // Safely hide original items
    });

    this.rebuildFavouritesSection();
  }

  private cloneForFavourite(item: ISidebarItem, parent: ISidebarItem): ISidebarItem {
    const { children: _children, parent: _originalParent, ...rest } = item;

    return {
      ...rest,
      parent,
      children: undefined,
      hidden: false,
      hiddenByFavourite: false, // Ensure the bookmark copy is visible
      type: 'item',
      favourite: true,
    };
  }

  private flattenItems(items: ISidebarItem[]): ISidebarItem[] {
    return items.flatMap((item) => (item.children ? [item, ...this.flattenItems(item.children)] : [item]));
  }

  private getState(): DrawerStates {
    const state = localStorage.getItem(DRAWER_STATE_KEY);
    return state === 'full' ? 'full' : 'half';
  }

  private initializeCollapsedDefaults(items: ISidebarItem[]) {
    this.walkItems(items, (item) => {
      if (this.initializedSections.has(item.name)) return;

      this.initializedSections.add(item.name);

      if (item.collapsed) {
        this.collapsedSections.add(item.name);
      }
    });
  }

  private loadFavourites() {
    const raw = localStorage.getItem(SIDEBAR_FAVOURITES_KEY);

    if (raw) {
      try {
        const stored = JSON.parse(raw) as string[];
        this.favourites = new Set(stored.map((route) => this.normalizeRoute(route)).filter(Boolean));
      } catch {
        this.favourites.clear();
      }
    }

    this.applyFavouritesToItems(this.items);
  }

  private matchesRoute(url: string, route: string) {
    const normalizedRoute = this.normalizeRoute(route);

    if (normalizedRoute === '/') return url === '/';

    return url === normalizedRoute || url.startsWith(`${normalizedRoute}/`);
  }

  private normalizeRoute(route: string) {
    if (!route) return '';

    const [pathWithHash = ''] = route.split('?');
    const path = pathWithHash.split('#')[0]!;
    const trimmed = path.endsWith('/') && path !== '/' ? path.slice(0, -1) : path;
    return trimmed || '/';
  }

  private persistFavourites() {
    localStorage.setItem(SIDEBAR_FAVOURITES_KEY, JSON.stringify([...this.favourites]));
  }

  private rebuildFavouritesSection() {
    const currentItems = this.itemsSignal();
    const favouritesSectionIndex = currentItems.findIndex((item) => item.type === 'bookmark');

    if (favouritesSectionIndex === -1) return;

    const favouritesSection = currentItems[favouritesSectionIndex]!;
    const favouriteRoutes = new Set(this.favourites);

    const favouriteItems = this.flattenItems(currentItems)
      .filter((item) => item.type !== 'bookmark' && item.parent?.type !== 'bookmark')
      .filter((item) => !!item.route && favouriteRoutes.has(this.normalizeRoute(item.route!)))
      .map((item) => this.cloneForFavourite(item, favouritesSection));

    const updatedSection: ISidebarItem = {
      ...favouritesSection,
      children: favouriteItems,
      hidden: favouriteItems.length === 0,
    };

    const updatedItems = [...currentItems];
    updatedItems[favouritesSectionIndex] = updatedSection;
    this.itemsSignal.set(updatedItems);
  }

  private setState(state: DrawerStates) {
    this.drawerStateSubject.set(state);
    localStorage.setItem(DRAWER_STATE_KEY, state);
    return state;
  }

  private updateItemFavourite(route: string, favourite: boolean) {
    this.walkItems(this.items, (item) => {
      if (item.type !== 'bookmark' && item.parent?.type !== 'bookmark') {
        if (item.route && this.normalizeRoute(item.route) === route) {
          item.favourite = favourite;
          item.hiddenByFavourite = favourite;
        }
      }
    });
  }

  private walkItems(items: ISidebarItem[], cb: (item: ISidebarItem) => void) {
    items.forEach((item) => {
      cb(item);
      if (item.children?.length) {
        this.walkItems(item.children, cb);
      }
    });
  }
}

type DrawerStates = 'full' | 'half';

const DRAWER_STATE_KEY = 'pc-drawerState';
const SIDEBAR_FAVOURITES_KEY = 'pc-sidebar-favourites';
