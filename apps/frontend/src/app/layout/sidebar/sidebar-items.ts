/**
 * Defines the structure and default list of items displayed in the sidebar navigation.
 */
import { PcIconNameType } from '@icons/icons.index';

/**
 * The sidebar items are defined here. They go in the order they're added
 */
export interface ISidebarItem {
  /**
   * If true then only admins can see this item
   */
  adminOnly?: boolean;

  /**
   * The badge to show on the item
   */
  badge?: string;

  /**
   * The color of the badge. Default is 'primary'
   */
  badgeColor?: 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info';
  children?: ISidebarItem[];
  collapsed?: boolean;

  /**
   * Whether the component should be hidden or not
   */
  hidden?: boolean;

  /**
   * The icon to show on the item
   */
  icon?: PcIconNameType;

  /**
   * The name of the item. It's shown on the sidebar
   */
  name: string;

  /**
   * The parent of this item. If this is not set then it's a top level item
   */
  parent?: ISidebarItem;

  /**
   * Whether the path should be matched exactly or not. It is used with the
   * Angular route
   */
  pathMatchExact?: boolean;

  /**
   * The route to navigate to when the item is clicked
   */
  route?: string;

  /**
   * Whether this is a component or a heading. If it's a heading then it's
   * not clickable
   */
  type?: 'item' | 'subheading';
}

/**
 * Default list of sidebar items used throughout the application.
 */
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
    name: `Tasks`,
    route: '/tasks',
    icon: 'rectangle-stack',
  },
  {
    name: `PEOPLE`,
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
        name: 'Lists',
        route: '/lists',
        icon: 'queue-list',
      },
      {
        name: 'Inbox',
        route: '/inbox',
        icon: 'envelope',
      },
      {
        name: 'Newsletters',
        route: '/newsletter',
        icon: 'megaphone',
      },
      {
        name: 'Map',
        route: '/map',
        icon: 'globe-americas',
      },
    ],
  },
  {
    name: `TEAMS`,
    type: 'subheading',
    collapsed: true,
    children: [
      {
        name: 'Volunteers',
        route: '/volunteers',
        icon: 'briefcase',
      },
      {
        name: 'Teams',
        route: '/teams',
        icon: 'user-group',
      },
      {
        name: 'Schedule',
        route: '/schedule',
        icon: 'clock',
      },
      {
        name: 'Donors',
        route: '/donors',
        icon: 'banknotes',
      },
      {
        name: 'Donations',
        route: '/donations',
        icon: 'currency-dollar',
      },
    ],
  },
  {
    name: `ADMIN`,
    type: 'subheading',
    collapsed: true,
    children: [
      {
        name: 'Export',
        route: '/export',
        icon: 'arrow-down-tray',
      },
      {
        name: 'Tags',
        route: '/tags',
        icon: 'tag',
      },
      {
        name: 'Forms',
        route: '/forms',
        icon: 'clipboard-document-list',
      },
      {
        name: 'Users',
        route: '/users',
        icon: 'users',
      },
      {
        name: 'Billing',
        route: '/billing',
        icon: 'credit-card',
      },
      {
        name: 'Settings',
        route: '/settings',
        icon: 'cog-6-tooth',
      },
    ],
  },
];
