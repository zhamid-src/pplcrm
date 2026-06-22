import { PcIconNameType } from '@icons/icons.index';

export interface ISidebarItem {
  adminOnly?: boolean;
  children?: ISidebarItem[];
  collapsed?: boolean;
  favourite?: boolean;
  hidden?: boolean;
  hiddenByFavourite?: boolean;
  icon?: PcIconNameType;
  indicator?: boolean;
  name: string;
  parent?: ISidebarItem;
  pathMatchExact?: boolean;
  route?: string;
  short_name?: string;
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
    name: `BOOKMARKS`,
    short_name: 'PINS',
    type: 'bookmark',
    hidden: true,
  },
  {
    name: `CRM`,
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
    ],
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
    name: `CAMPAIGN`,
    type: 'subheading',
    children: [
      {
        name: 'Volunteers',
        route: '/volunteers',
        icon: 'volunteer',
      },
      {
        name: 'Teams',
        route: '/teams',
        icon: 'user-group',
      },
      {
        name: 'Events',
        route: '/events',
        icon: 'calendar',
      },
      {
        name: 'Forms',
        route: '/forms',
        icon: 'clipboard-document-list',
      },
    ],
  },
  {
    name: 'FUNDRAISING',
    type: 'subheading',
    children: [
      {
        name: 'Donors',
        route: '/donors',
        icon: 'document-currency-dollar',
      },
      {
        name: 'Donations',
        route: '/donations',
        icon: 'currency-dollar',
      },
    ],
  },
  {
    name: 'WORKSPACE',
    type: 'subheading',
    collapsed: true,
    children: [
      {
        name: `Task List`,
        route: '/tasks',
        icon: 'rectangle-stack',
      },
      {
        name: `Task Board`,
        route: '/board',
        icon: 'view-kanban',
      },
    ],
  },
  {
    name: 'DATA',
    type: 'subheading',
    collapsed: true,
    children: [
      {
        name: `Duplicates`,
        route: '/duplicates',
        icon: 'document-duplicate',
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
      {
        name: 'Files',
        route: '/files',
        icon: 'document',
      },
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
    ],
  },
  {
    name: `SYSTEM`,
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
        name: 'Configuration',
        route: '/configuration',
        icon: 'wrench-screwdriver',
      },
    ],
  },
];
