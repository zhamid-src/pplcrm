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
      },
      {
        name: 'Newsletters',
        route: '/newsletters',
        icon: 'megaphone',
      },

      {
        name: 'Lists',
        route: '/lists',
        icon: 'queue-list',
      },
      {
        name: `Automations`,
        route: '/workflows',
        icon: 'cog',
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
      },
      {
        name: `Households`,
        route: '/households',
        icon: 'house-modern',
      },
      {
        name: `Companies`,
        route: '/companies',
        icon: 'briefcase',
      },
      {
        name: `Duplicates`,
        route: '/duplicates',
        icon: 'document-duplicate',
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
      },
      {
        name: 'Donations',
        route: '/donations',
        icon: 'currency-dollar',
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
      },
      {
        name: 'Shifts',
        route: '/events/shifts',
        icon: 'add-schedule',
      },
      {
        name: 'Events',
        route: '/events/pages',
        icon: 'ticket',
      },
      {
        name: 'Fundraising',
        route: '/donation-pages',
        icon: 'currency-dollar',
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
      },
      {
        name: `Task Board`,
        route: '/board',
        icon: 'view-kanban',
      },
      {
        name: 'Files',
        route: '/files',
        icon: 'document',
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
        route: '/configuration',
        icon: 'wrench-screwdriver',
      },
    ],
  },
];
