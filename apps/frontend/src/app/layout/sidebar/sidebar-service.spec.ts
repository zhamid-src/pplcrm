/**
 * Unit tests covering SidebarService behavior for drawer state and route lookup.
 */
import { SidebarService } from './sidebar-service';

describe('SidebarService', () => {
  let service: SidebarService;
  let store: Record<string, string>;

  beforeEach(() => {
    store = {};
    const mockLocalStorage = {
      getItem: (key: string) => (key in store ? store[key] : null),
      setItem: (key: string, value: string) => {
        store[key] = value;
      },
      removeItem: (key: string) => {
        delete store[key];
      },
      clear: () => {
        store = {};
      },
    } as Storage;
    Object.defineProperty(global, 'localStorage', { value: mockLocalStorage });
    service = new SidebarService();
  });

  it('should toggle mobile drawer', () => {
    expect(service.isMobileOpen).toBe(false);
    service.toggleMobile();
    expect(service.isMobileOpen).toBe(true);
  });

  it('should toggle drawer state and persist', () => {
    expect(service.isHalf()).toBe(true);
    service.toggleDrawer();
    expect(service.isFull()).toBe(true);
    expect(store['pc-drawerState']).toBe('full');
  });

  it('should return route for destination', () => {
    expect(service.getRoute('people')).toBe('/people');
  });

  it('should return undefined for unknown destination', () => {
    expect(service.getRoute('unknown')).toBeUndefined();
  });

  it('should persist favourite state and expose it via items', () => {
    expect(service.isFavourite('/people')).toBe(false);
    service.setFavourite('/people', true);

    expect(service.isFavourite('/people')).toBe(true);
    expect(store['pc-sidebar-favourites']).toContain('/people');

    const matched = service.findItemForUrl('/people/123');
    expect(matched?.name).toBe('People');
    expect(matched?.favourite).toBe(true);
  });

  it('should load favourite state from storage on init', () => {
    store['pc-sidebar-favourites'] = JSON.stringify(['/tasks']);

    service = new SidebarService();

    expect(service.isFavourite('/tasks')).toBe(true);
    const matched = service.findItemForUrl('/tasks');
    expect(matched?.favourite).toBe(true);
  });
});
