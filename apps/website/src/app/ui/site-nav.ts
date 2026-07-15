import { environment } from '../../environments/environment';

export interface NavLink {
  readonly label: string;
  /** Internal router path. */
  readonly path: string;
}

/** The primary audience + pricing nav, shared by the header and footers. */
export const PRIMARY_NAV: readonly NavLink[] = [
  { label: 'For constituency offices', path: '/for/offices' },
  { label: 'For campaigns', path: '/for/campaigns' },
  { label: 'For non-profits', path: '/for/nonprofits' },
  { label: 'Compare', path: '/compare' },
  { label: 'Pricing', path: '/pricing' },
];

/**
 * The CRM lives on a separate host (see environment.appUrl). "Log in" and
 * "Start free" leave the marketing site for the app, so they are absolute URLs,
 * not router links.
 */
export const LOGIN_URL = `${environment.appUrl}/signin`;
export const SIGNUP_URL = `${environment.appUrl}/signup`;
// Signed-in visitors go straight to the app (its root redirects to the dashboard).
export const DASHBOARD_URL = environment.appUrl;
