import type { Route } from '@angular/router';

/**
 * The companion app has exactly two routable surfaces — one per capability
 * token. Everything else (view state inside an app) is client-side only; the
 * token is the whole URL contract, nothing else is bookmarkable.
 */
export const appRoutes: Route[] = [
  {
    path: 't/:token',
    loadComponent: () => import('./canvass/canvass-page').then((m) => m.CanvassPage),
  },
  {
    path: 'r/:token',
    loadComponent: () => import('./deliveries/route-page').then((m) => m.RoutePage),
  },
  {
    path: '**',
    loadComponent: () => import('./gate/dead-link-page').then((m) => m.DeadLinkPage),
  },
];
