import { IconName } from '@uxcommon/svg-icons-list';

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

  /**
   * Whether the component should be hidden or not
   */
  hidden?: boolean;

  /**
   * The icon to show on the item
   */
  icon?: IconName;

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

export const SidebarItems: ISidebarItem[] = [
  {
    name: `Summary`,
    route: '/console/summary',
    icon: 'presentation-chart-line',
    pathMatchExact: true,
  },
  {
    name: `MyTasks`,
    route: '/console/mytasks',
    icon: 'rectangle-stack',
  },
  {
    name: `PEOPLE`,
    type: 'subheading',
    children: [
      {
        name: `People`,
        route: '/console/people',
        icon: 'identification',
      },
      {
        name: `Households`,
        route: '/console/households',
        icon: 'house-modern',
      },
      {
        name: 'Emails',
        route: '/console/emails',
        icon: 'envelope',
      },
      {
        name: 'Segments',
        route: '/console/segments',
        icon: 'chart-pie',
      },
      {
        name: 'Lists',
        route: '/console/lists',
        icon: 'queue-list',
      },
    ],
  },

  {
    name: `OUTREACH`,
    type: 'subheading',
    children: [
      {
        name: 'Campaigns',
        route: '/console/campaigns',
        icon: 'megaphone',
      },
      {
        name: 'Canvassing',
        route: '/console/canvassing',
        icon: 'map',
      },
      {
        name: 'Map',
        route: '/console/map',
        icon: 'globe-americas',
      },
    ],
  },
  {
    name: `TEAMS`,
    type: 'subheading',
    children: [
      {
        name: 'Volunteers',
        route: '/console/volunteers',
        icon: 'briefcase',
      },
      {
        name: 'Teams',
        route: '/console/teams',
        icon: 'user-group',
      },
      {
        name: 'Schedule',
        route: '/console/schedule',
        icon: 'clock',
      },
      {
        name: 'Donors',
        route: '/console/donors',
        icon: 'banknotes',
      },
      {
        name: 'Donations',
        route: '/console/donations',
        icon: 'currency-dollar',
      },
    ],
  },
  {
    name: `ADMIN`,
    type: 'subheading',
    children: [
      {
        name: 'Export',
        route: '/console/export',
        icon: 'arrow-down-tray',
      },
      {
        name: `Tasks`,
        route: '/console/tasks',
        icon: 'square-3-stack-3d',
      },
      {
        name: 'Tags',
        route: '/console/tags',
        icon: 'tag',
      },
      {
        name: 'Forms',
        route: '/console/forms',
        icon: 'clipboard-document-list',
      },
      {
        name: 'Users',
        route: '/console/users',
        icon: 'users',
      },
      {
        name: 'Billing',
        route: '/console/billing',
        icon: 'credit-card',
      },
      {
        name: 'Settings',
        route: '/console/settings',
        icon: 'cog-6-tooth',
      },
    ],
  },
];
