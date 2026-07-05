import type { ISidebarItem } from './sidebar-items';
import { SidebarItems } from './sidebar-items';

/** Flatten the sidebar tree (top-level items plus their children) into a single list. */
function flatten(items: ISidebarItem[]): ISidebarItem[] {
  return items.flatMap((item) => (item.children ? [item, ...flatten(item.children)] : [item]));
}

describe('SidebarItems', () => {
  const all = flatten(SidebarItems);
  const navigable = all.filter((item) => item.type !== 'subheading' && item.type !== 'bookmark' && !item.hidden);

  it('gives every navigable item a non-empty route', () => {
    for (const item of navigable) {
      expect(item.route, `item "${item.name}" is missing a route`).toBeTruthy();
    }
  });

  it('gives every navigable item an icon', () => {
    for (const item of navigable) {
      expect(item.icon, `item "${item.name}" is missing an icon`).toBeTruthy();
    }
  });

  it('does not repeat the same route across entries', () => {
    const routes = navigable.map((item) => item.route);
    const unique = new Set(routes);
    expect(unique.size).toBe(routes.length);
  });

  it('uses a unique single lowercase letter for every navigation shortcut', () => {
    const withShortcut = all.filter((item) => item.shortcut != null);
    for (const item of withShortcut) {
      expect(item.shortcut, `item "${item.name}" has a malformed shortcut`).toMatch(/^[a-z]$/);
      expect(item.route, `item "${item.name}" has a shortcut but no route`).toBeTruthy();
    }
    const keys = withShortcut.map((item) => item.shortcut);
    expect(new Set(keys).size, 'sidebar shortcut keys must be unique').toBe(keys.length);
  });

  it('marks the admin-only SYSTEM section as adminOnly', () => {
    const system = SidebarItems.find((item) => item.name === 'SYSTEM');
    expect(system?.adminOnly).toBe(true);
  });

  it('includes the Dashboard entry pointing at /summary with exact path matching', () => {
    const dashboard = SidebarItems.find((item) => item.name === 'Dashboard');
    expect(dashboard?.route).toBe('/summary');
    expect(dashboard?.pathMatchExact).toBe(true);
  });

  it('hides the internal App root entry from the visible sidebar', () => {
    const appEntry = SidebarItems.find((item) => item.name === 'App');
    expect(appEntry?.hidden).toBe(true);
  });
});
