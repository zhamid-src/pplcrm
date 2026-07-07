import type { PcIconNameType } from '@icons/icons.index';

export interface ISidebarItem {
  adminOnly?: boolean;
  children?: ISidebarItem[];
  collapsed?: boolean;
  favourite?: boolean;
  hidden?: boolean;
  hiddenByFavourite?: boolean;
  icon?: PcIconNameType;
  indicator?: boolean;
  /** Transient: set on a pin clone so the sidebar plays the `up` entry once. */
  justPinned?: boolean;
  name: string;
  parent?: ISidebarItem;
  pathMatchExact?: boolean;
  route?: string;
  /**
   * Second key of the Gmail-style `g` navigation chord (press `g` then this key).
   * A single lowercase letter, unique across all items. Rendered as a hint in the
   * sidebar and consumed by KeyboardShortcutsService to route there.
   */
  shortcut?: string;
  type?: 'item' | 'subheading' | 'bookmark';
}

// Sidebar IA follows the North Star module map (spec §0). Section order and
// membership are load-bearing; do not reshuffle without checking the spec.
export const SidebarItems: ISidebarItem[] = [
  {
    name: 'App',
    route: '/',
    hidden: true,
  },
  {
    name: `Dashboard`,
    route: '/dashboard',
    icon: 'presentation-chart-line',
    pathMatchExact: true,
    shortcut: 'h',
  },
  {
    name: `PINS`,
    type: 'bookmark',
    hidden: true,
  },
  {
    name: `WORK`,
    type: 'subheading',
    children: [
      {
        name: 'Inbox',
        route: '/inbox',
        icon: 'envelope',
        shortcut: 'i',
        // TODO(badge): show open-conversation count (spec §3). Needs a cheap
        // tenant-scoped `emails.countOpen` tRPC query; no such endpoint yet.
      },
      {
        name: `Tasks`,
        route: '/tasks',
        icon: 'task',
        shortcut: 'k',
        // TODO(badge): show SLA-breach count (spec §4). Needs a tenant-scoped
        // `tasks.countSlaBreaches` query; no such endpoint yet.
      },
      // Hidden: the board lives behind the Tasks page (swap button is Wave 1B),
      // but the `g b` chord, the pin button and the help overlay keep working.
      {
        name: `Task board`,
        route: '/board',
        icon: 'view-kanban',
        shortcut: 'b',
        hidden: true,
      },
      {
        name: `People`,
        route: '/people',
        icon: 'identification',
        shortcut: 'p',
      },
      // Hidden: Households and Companies are grains of the People grid (spec §5)
      // reached via the grain tabs; kept here so the `g u` / `g c` chords, the
      // pin button and the help overlay keep working.
      {
        name: `Households`,
        route: '/households',
        icon: 'house-modern',
        shortcut: 'u',
        hidden: true,
      },
      {
        name: `Companies`,
        route: '/companies',
        icon: 'briefcase',
        shortcut: 'c',
        hidden: true,
      },
    ],
  },
  {
    name: `OUTREACH`,
    type: 'subheading',
    children: [
      {
        name: 'Newsletters',
        route: '/newsletters',
        icon: 'megaphone',
        shortcut: 'n',
      },
      {
        name: 'Lists',
        route: '/lists',
        icon: 'queue-list',
        shortcut: 'l',
      },
      {
        name: 'Forms',
        route: '/forms',
        icon: 'clipboard-document-list',
        shortcut: 'f',
      },
      {
        name: 'Donations',
        route: '/donations',
        icon: 'currency-dollar',
        shortcut: 'o',
      },
      // Wave 3J: Fundraising (donation pages, §12) folds under Donations. Kept
      // here so the feature stays reachable until the Donations page links to it.
      {
        name: 'Fundraising',
        route: '/donation-pages',
        icon: 'currency-dollar',
        shortcut: 'r',
      },
    ],
  },
  {
    name: `FIELD`,
    type: 'subheading',
    collapsed: true,
    children: [
      // Wave 2: Canvassing (§13), Deliveries (§14) — surfaces do not exist yet.
      {
        name: 'Events',
        route: '/events/pages',
        icon: 'ticket',
        shortcut: 'e',
      },
      {
        name: 'Teams',
        route: '/teams',
        icon: 'user-group',
        shortcut: 't',
      },
      // Wave 3K: Shifts (§15) folds into Teams. Kept here so the feature stays
      // reachable until the Teams page surfaces shifts.
      {
        name: 'Shifts',
        route: '/events/shifts',
        icon: 'add-schedule',
        shortcut: 's',
      },
    ],
  },
  {
    name: `DATA`,
    type: 'subheading',
    collapsed: true,
    children: [
      {
        name: 'Import / export',
        route: '/imports',
        icon: 'arrow-up-tray',
      },
      // Wave 1E: the Exports page folds into the Import / export wizard (§17).
      // Kept as its own entry until then so exports stay reachable.
      {
        name: 'Exports',
        route: '/exports',
        icon: 'arrow-down-tray',
      },
      {
        name: `Duplicates`,
        route: '/duplicates',
        icon: 'document-duplicate',
        shortcut: 'd',
        // TODO(badge): show merge-queue count (spec §9). Needs a tenant-scoped
        // `duplicates.countQueue` query; no such endpoint yet.
      },
      {
        name: 'Tags',
        route: '/tags',
        icon: 'label',
      },
      {
        name: 'Issues',
        route: '/issues',
        icon: 'shield-exclamation',
      },
      {
        name: `Automations`,
        route: '/automations',
        icon: 'cog',
        shortcut: 'a',
      },
      {
        name: 'Files',
        route: '/files',
        icon: 'document',
        shortcut: 'm',
      },
    ],
  },
  {
    name: `ADMIN`,
    type: 'subheading',
    adminOnly: true,
    collapsed: true,
    children: [
      {
        name: 'Users',
        route: '/users',
        icon: 'users',
      },
      {
        name: 'Activity',
        route: '/activity',
        icon: 'clipboard-document-list',
      },
      {
        name: 'Workspace',
        route: '/workspace',
        icon: 'wrench-screwdriver',
      },
      {
        name: 'Help',
        route: '/help',
        icon: 'information-circle',
      },
    ],
  },
];
