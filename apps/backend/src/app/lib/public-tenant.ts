import { RESERVED_SUBDOMAINS } from '@common';

import { BaseRepository } from './base.repo';
import { env } from '../../env';

/**
 * Tenant resolution for unauthenticated public pages (forms /f/:slug, event RSVP /e/:slug,
 * volunteer signup /v/:slug, donations). Every public lookup is keyed (tenant, slug); the tenant
 * is identified by its subdomain — from the explicit `?t=` param (the SPA passes its own
 * subdomain, robust across hosts) or the request Host — never by a cross-tenant record query.
 */

/**
 * Extract a tenant subdomain label from a request Host. `riverton.mydomain.com` → `riverton` when
 * the base domain is `mydomain.com`. Returns null for the bare/app host, reserved labels, or a
 * mismatch.
 */
export function tenantSlugFromHost(hostname: string | undefined): string | null {
  if (!hostname) return null;
  const host = hostname.split(':')[0]?.toLowerCase();
  const base = env.publicBaseDomain.toLowerCase();
  if (!host || host === base) return null;
  const suffix = `.${base}`;
  if (!host.endsWith(suffix)) return null;
  const label = host.slice(0, -suffix.length);
  // Only a single left-most label maps to a tenant (no nested subdomains).
  if (!label || label.includes('.') || RESERVED_SUBDOMAINS.has(label)) return null;
  return label;
}

export interface PublicTenant {
  id: string;
  slug: string;
}

/**
 * Resolve a tenant from its public subdomain slug. The `tenants` table is tenant-safety
 * allow-listed (you look it up *by* its own key).
 */
export async function resolveTenantBySlug(tenantSlug: string): Promise<PublicTenant | null> {
  const row = await BaseRepository.dbInstance
    .selectFrom('tenants')
    .select('id')
    .where('slug', '=', tenantSlug)
    .executeTakeFirst();
  return row ? { id: String(row.id), slug: tenantSlug } : null;
}

/**
 * Resolve a tenant by id — the workspace-API-key path, where the key (not the Host/`?t=`)
 * already identifies the tenant. Same allow-listed `tenants` self-lookup as above.
 */
export async function resolveTenantById(tenantId: string): Promise<PublicTenant | null> {
  const row = await BaseRepository.dbInstance
    .selectFrom('tenants')
    .select('slug')
    .where('id', '=', tenantId)
    .executeTakeFirst();
  return row?.slug ? { id: tenantId, slug: String(row.slug) } : null;
}

/** Org display name for public pages (same source as the /f/:slug page header). */
export async function publicOrgName(tenantId: string): Promise<string> {
  const row = await BaseRepository.dbInstance
    .selectFrom('settings')
    .select('value')
    .where('tenant_id', '=', tenantId)
    .where('key', '=', 'organization.name')
    .executeTakeFirst();
  const value = row?.value;
  return typeof value === 'string' && value.trim() ? value : 'Our organization';
}

/**
 * Resolve the tenant for a public request: `?t=<tenantSlug>` first, then the Host subdomain.
 * Returns null when neither identifies a known tenant — callers should 404 without revealing
 * whether the slug or the tenant was the miss.
 */
export async function resolveTenantFromRequest(req: {
  query?: unknown;
  hostname?: string;
}): Promise<PublicTenant | null> {
  const query = req.query as Record<string, unknown> | undefined;
  const t = typeof query?.['t'] === 'string' ? query['t'].trim() : '';
  const tenantSlug = t || tenantSlugFromHost(req.hostname);
  if (!tenantSlug) return null;
  return resolveTenantBySlug(tenantSlug);
}
