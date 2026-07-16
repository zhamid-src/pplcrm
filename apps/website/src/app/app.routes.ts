import type { Route } from '@angular/router';

/**
 * The /for/… audience URLs render the home page with that audience's hero
 * preselected (via route data) — the full story, tailored, instead of a thin
 * duplicate page that would strand visitors who land on it first. Footer
 * links to pages we haven't built yet resolve to the shared "coming soon"
 * stub so the nav never 404s; swap a stub for a real component when the page
 * exists.
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
    data: { audience: 'office' },
    loadComponent: () => import('./home/home-page').then((m) => m.HomePage),
  },
  {
    path: 'for/campaigns',
    title: 'For campaigns — pplCRM',
    data: { audience: 'camp' },
    loadComponent: () => import('./home/home-page').then((m) => m.HomePage),
  },
  {
    path: 'for/nonprofits',
    title: 'For non-profits — pplCRM',
    data: { audience: 'np' },
    loadComponent: () => import('./home/home-page').then((m) => m.HomePage),
  },
  {
    path: 'compare',
    title: 'pplCRM vs. the spreadsheet stack — pplCRM',
    loadComponent: () => import('./compare/compare-page').then((m) => m.ComparePage),
  },
  {
    path: 'pricing',
    title: 'Pricing — pplCRM',
    loadComponent: () => import('./pricing/pricing-page').then((m) => m.PricingPage),
  },
  {
    path: 'docs',
    pathMatch: 'full',
    title: 'Docs — pplCRM',
    loadComponent: () => import('./docs/docs-home').then((m) => m.DocsHome),
  },
  {
    // Per-article title/meta/canonical are set inside the component from the
    // resolved article (see DocsArticle).
    path: 'docs/:id',
    title: 'Docs — pplCRM',
    loadComponent: () => import('./docs/docs-article').then((m) => m.DocsArticle),
  },
  {
    path: 'about',
    title: 'About us — pplCRM',
    loadComponent: () => import('./company/about-page').then((m) => m.AboutPage),
  },
  {
    path: 'careers',
    title: 'Careers — pplCRM',
    loadComponent: () => import('./company/careers-page').then((m) => m.CareersPage),
  },
  {
    path: 'data-ownership',
    title: 'Data ownership — pplCRM',
    loadComponent: () => import('./company/data-ownership-page').then((m) => m.DataOwnershipPage),
  },
  {
    path: 'privacy',
    title: 'Privacy policy — pplCRM',
    loadComponent: () => import('./legal/privacy-page').then((m) => m.PrivacyPage),
  },
  {
    path: 'eula',
    title: 'End user license agreement — pplCRM',
    loadComponent: () => import('./legal/eula-page').then((m) => m.EulaPage),
  },
  {
    path: 'security',
    title: 'Security — pplCRM',
    loadComponent: () => import('./legal/security-page').then((m) => m.SecurityPage),
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
