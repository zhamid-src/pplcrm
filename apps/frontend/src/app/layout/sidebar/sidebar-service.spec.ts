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
    expect(service.getRoute('people')).toBe('/console/people');
  });

  it('should return undefined for unknown destination', () => {
    expect(service.getRoute('unknown')).toBeUndefined();
  });
});
