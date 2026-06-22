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
    name: `Summary`,
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
    name: `CONSTITUENCY`,
    short_name: 'DATA',
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
      {
        name: 'Forms',
        route: '/forms',
        icon: 'clipboard-document-list',
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
        name: 'Donations',
        route: '/donations',
        icon: 'currency-dollar',
      },
      {
        name: 'Lists',
        route: '/lists',
        icon: 'queue-list',
      },

      {
        name: 'Workflows',
        route: '/workflows',
        icon: 'cog',
      },
    ],
  },
  {
    name: `OUTREACH`,
    type: 'subheading',
    children: [
      {
        name: 'Donors',
        route: '/donors',
        icon: 'document-currency-dollar',
      },
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
        icon: 'rectangle-stack',
      },
      {
        name: `Board`,
        route: '/board',
        icon: 'view-kanban',
      },
      {
        name: 'Exports',
        route: '/exports',
        icon: 'arrow-down-tray',
      },
      {
        name: 'Imports',
        route: '/imports',
        icon: 'arrow-up-tray',
      },
      {
        name: 'Files',
        route: '/files',
        icon: 'document',
      },
      {
        name: 'Activity',
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
        icon: 'cog-6-tooth',
      },
    ],
  },
];
