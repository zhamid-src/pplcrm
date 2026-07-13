import { environment } from '../../environments/environment';

/**
 * Helpers for the tenant-subdomain public page model. Every public surface (forms /f/:slug,
 * event RSVP /e/:slug, volunteer /volunteer + /v/:slug, donations) lives on
 * `https://<tenantSlug>.<publicBaseDomain>/<path>`; the SPA passes its own subdomain to the API as
 * `?t=` so tenant resolution works on any host (including dev, where the Host header is enough in
 * Chrome via `<slug>.localhost` but not guaranteed elsewhere).
 */

/** API origin without a trailing slash. */
export function apiBase(): string {
  return environment.apiUrl.replace(/\/$/, '');
}

/**
 * The tenant subdomain the current page is being served on
 * (`riverton.mydomain.com` → `riverton`), or null on the bare app host.
 */
export function tenantFromHost(): string | null {
  const host = window.location.hostname.toLowerCase();
  const base = environment.publicBaseDomain.toLowerCase();
  if (!host || host === base) return null;
  const suffix = `.${base}`;
  if (!host.endsWith(suffix)) return null;
  const label = host.slice(0, -suffix.length);
  if (!label || label.includes('.')) return null;
  return label;
}

/** `?t=<tenant>` query suffix for public API calls made from a public page. */
export function tenantQuery(): string {
  const tenant = tenantFromHost();
  return tenant ? `?t=${encodeURIComponent(tenant)}` : '';
}

/**
 * Shareable public URL for authenticated admin UI: `https://<tenantSlug>.<base>/<path>`, falling
 * back to the current origin when no tenant subdomain is configured (dev without wildcard DNS).
 * `path` must not start with a slash.
 */
export function publicPageUrl(tenantSlug: string | null | undefined, path: string): string {
  const base = environment.publicBaseDomain;
  if (tenantSlug && base) {
    return `https://${tenantSlug}.${base}/${path}`;
  }
  return `${window.location.origin}/${path}`;
}

/**
 * Absolute URL to a volunteer companion surface (canvass `/t/:token`, deliveries `/r/:token`). In
 * production the companion apps are path-routed on the CRM's own domain, so we use the current
 * origin; in dev they run on a separate port, so `environment.companionOrigin` overrides it —
 * otherwise a copied link would point back at the CRM host and 404. `path` must start with a slash.
 */
export function companionUrl(path: string): string {
  return `${environment.companionOrigin || window.location.origin}${path}`;
}
