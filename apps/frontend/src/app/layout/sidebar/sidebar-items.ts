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

export const SidebarItems: ISidebarItem[] = [
  {
    name: 'App',
    route: '/',
    hidden: true,
  },
  {
    name: `Dashboard`,
    route: '/summary',
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
    name: `ENGAGE`,
    type: 'subheading',
    children: [
      {
        name: 'Inbox',
        route: '/inbox',
        icon: 'envelope',
        shortcut: 'i',
      },
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
        name: `Automations`,
        route: '/workflows',
        icon: 'cog',
        shortcut: 'a',
      },
    ],
  },
  {
    name: `CONTACTS`,
    type: 'subheading',
    children: [
      {
        name: `People`,
        route: '/people',
        icon: 'identification',
        shortcut: 'p',
      },
      {
        name: `Households`,
        route: '/households',
        icon: 'house-modern',
        shortcut: 'u',
      },
      {
        name: `Companies`,
        route: '/companies',
        icon: 'briefcase',
        shortcut: 'c',
      },
      {
        name: `Duplicates`,
        route: '/duplicates',
        icon: 'document-duplicate',
        shortcut: 'd',
      },
    ],
  },
  {
    name: `CAMPAIGN`,
    type: 'subheading',
    children: [
      {
        name: 'Teams',
        route: '/teams',
        icon: 'user-group',
        shortcut: 't',
      },
      {
        name: 'Donations',
        route: '/donations',
        icon: 'currency-dollar',
        shortcut: 'o',
      },
    ],
  },
  {
    name: 'FORMS',
    type: 'subheading',
    collapsed: true,
    children: [
      {
        name: 'Forms',
        route: '/forms',
        icon: 'clipboard-document-list',
        shortcut: 'f',
      },
      {
        name: 'Shifts',
        route: '/events/shifts',
        icon: 'add-schedule',
        shortcut: 's',
      },
      {
        name: 'Events',
        route: '/events/pages',
        icon: 'ticket',
        shortcut: 'e',
      },
      {
        name: 'Fundraising',
        route: '/donation-pages',
        icon: 'currency-dollar',
        shortcut: 'r',
      },
    ],
  },
  {
    name: 'TOOLS',
    type: 'subheading',
    collapsed: true,
    children: [
      {
        name: `Tasks`,
        route: '/tasks',
        icon: 'task',
        shortcut: 'k',
      },
      {
        name: `Task Board`,
        route: '/board',
        icon: 'view-kanban',
        shortcut: 'b',
      },
      {
        name: 'Files',
        route: '/files',
        icon: 'document',
        shortcut: 'm',
      },
      {
        name: 'Imports',
        route: '/imports',
        icon: 'arrow-up-tray',
      },
      {
        name: 'Exports',
        route: '/exports',
        icon: 'arrow-down-tray',
      },
    ],
  },
  {
    name: `SYSTEM`,
    type: 'subheading',
    adminOnly: true,
    collapsed: true,
    children: [
      {
        name: 'Activity Log',
        route: '/activities',
        icon: 'clipboard-document-list',
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
        name: 'Users',
        route: '/users',
        icon: 'users',
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
