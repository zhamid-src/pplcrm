import type { Route } from '@angular/router';

import { AUDIENCE_CONFIG } from './audience/audience-content';

/**
 * Two real pages (Home, FAQ). The design links to several pages we haven't
 * built yet (the audience pages and Pricing) — those resolve to a shared
 * "coming soon" stub so the nav never 404s. Swap a stub for a real component
 * when the page exists.
 */
export const appRoutes: Route[] = [
  {
    path: '',
    pathMatch: 'full',
    title: 'pplCRM — One list for constituents, voters, donors and volunteers',
    loadComponent: () => import('./home/home-page').then((m) => m.HomePage),
  },
  {
    path: 'faq',
    title: 'FAQ — pplCRM',
    loadComponent: () => import('./faq/faq-page').then((m) => m.FaqPage),
  },
  {
    path: 'for/offices',
    title: 'For constituency offices — pplCRM',
    data: { config: AUDIENCE_CONFIG['offices'] },
    loadComponent: () => import('./audience/audience-page').then((m) => m.AudiencePage),
  },
  {
    path: 'for/campaigns',
    title: 'For campaigns — pplCRM',
    data: { config: AUDIENCE_CONFIG['campaigns'] },
    loadComponent: () => import('./audience/audience-page').then((m) => m.AudiencePage),
  },
  {
    path: 'for/nonprofits',
    title: 'For non-profits — pplCRM',
    data: { config: AUDIENCE_CONFIG['nonprofits'] },
    loadComponent: () => import('./audience/audience-page').then((m) => m.AudiencePage),
  },
  {
    path: 'pricing',
    title: 'Pricing — pplCRM',
    loadComponent: () => import('./pricing/pricing-page').then((m) => m.PricingPage),
  },
  {
    // Generic stub for footer links whose real page doesn't exist yet; the
    // heading comes from a ?pageTitle= query param (bound via component input).
    path: 'soon',
    title: 'Coming soon — pplCRM',
    loadComponent: () => import('./coming-soon/coming-soon-page').then((m) => m.ComingSoonPage),
  },
  {
    path: '**',
    redirectTo: '',
  },
];
