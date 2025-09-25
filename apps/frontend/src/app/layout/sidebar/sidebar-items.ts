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
  favourite?: boolean;

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
    name: `STARRED`,
    type: 'subheading',
    hidden: true,
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
        name: 'Newsletter',
        route: '/newsletter',
        icon: 'megaphone',
      },
    ],
  },
  {
    name: `TEAMS`,
    type: 'subheading',
    collapsed: true,
    children: [
      {
        name: 'Teams',
        route: '/teams',
        icon: 'user-group',
      },
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
        name: 'Volunteers',
        route: '/volunteers',
        icon: 'volunteer',
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
        name: 'Exports',
        route: '/export',
        icon: 'arrow-down-tray',
      },
      {
        name: 'Imports',
        route: '/imports',
        icon: 'arrow-up-tray',
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
