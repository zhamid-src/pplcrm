import type { Kysely } from 'kysely';
import { sql } from 'kysely';

/**
 * Volunteer-event slugs become unique per tenant instead of globally.
 *
 * The app-level uniqueness checks (addEvent/updateEvent/checkSlugUnique) have always been
 * tenant-scoped, but the DB constraint was global — so the first tenant to claim "bbq-setup"
 * blocked every other tenant with a raw constraint error the UI never anticipated. Public
 * lookups are now tenant-scoped too (tenant resolved from the subdomain, like /f/:slug), so
 * per-tenant uniqueness is the correct invariant.
 *
 * No de-duplication pass is needed: global uniqueness held until now, so no (tenant_id, slug)
 * pair can collide.
 */
export async function up(db: Kysely<any>): Promise<void> {
  await sql`
    ALTER TABLE public.volunteer_events DROP CONSTRAINT IF EXISTS volunteer_events_slug_unique;
    CREATE UNIQUE INDEX IF NOT EXISTS idx_volunteer_events_tenant_slug
      ON public.volunteer_events (tenant_id, slug);
  `.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  // Re-adding the global constraint fails if two tenants now share a slug; that data state is
  // valid under this migration, so down() is best-effort for pristine rollbacks only.
  await sql`
    DROP INDEX IF EXISTS public.idx_volunteer_events_tenant_slug;
    ALTER TABLE public.volunteer_events ADD CONSTRAINT volunteer_events_slug_unique UNIQUE (slug);
  `.execute(db);
}
