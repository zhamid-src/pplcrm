import type { Kysely } from 'kysely';
import { sql } from 'kysely';

/**
 * I-3: Add indexes on the foreign keys that actually hurt — referential-integrity
 * cascade targets and hot application lookups (schema review 2026-07-06, §4).
 *
 * The map tables' tenant-leading PKs do NOT help RI triggers: deleting a parent
 * (e.g. DELETE FROM tags WHERE id=$1) fires `... WHERE tag_id = $1` with no
 * tenant qualifier, forcing a sequential scan of the map table per deleted row.
 * Audit columns (createdby_id/updatedby_id) are intentionally left unindexed.
 *
 * idx_map_teams_persons_person already exists on this database; IF NOT EXISTS
 * makes that one a no-op and keeps the whole migration re-runnable.
 *
 * Plain CREATE INDEX is fine at dev size; production would use
 * CREATE INDEX CONCURRENTLY (outside a migration transaction).
 */
export async function up(db: Kysely<any>): Promise<void> {
  await sql`
    -- Hot application path: "people in this household" + placeholder reassignment on delete
    CREATE INDEX IF NOT EXISTS idx_persons_tenant_household ON public.persons (tenant_id, household_id);

    -- RI cascade targets: single-column FKs with no leading index anywhere
    CREATE INDEX IF NOT EXISTS idx_map_peoples_tags_tag ON public.map_peoples_tags (tag_id);
    CREATE INDEX IF NOT EXISTS idx_map_households_tags_tag ON public.map_households_tags (tag_id);
    CREATE INDEX IF NOT EXISTS idx_map_lists_persons_person ON public.map_lists_persons (person_id);
    CREATE INDEX IF NOT EXISTS idx_map_lists_households_hh ON public.map_lists_households (household_id);
    CREATE INDEX IF NOT EXISTS idx_map_teams_persons_person ON public.map_teams_persons (person_id);
    CREATE INDEX IF NOT EXISTS idx_map_teams_lists_list ON public.map_teams_lists (list_id);
    CREATE INDEX IF NOT EXISTS idx_email_comments_email ON public.email_comments (email_id);
    CREATE INDEX IF NOT EXISTS idx_workflow_enrollments_person ON public.workflow_enrollments (person_id);
    CREATE INDEX IF NOT EXISTS idx_volunteer_shifts_event_ri ON public.volunteer_shifts (event_id);
    CREATE INDEX IF NOT EXISTS idx_volunteer_shifts_person_ri ON public.volunteer_shifts (person_id);
    CREATE INDEX IF NOT EXISTS idx_email_trash_folder ON public.email_trash (from_folder_id);

    -- SET NULL paths, kept tiny with partial indexes
    CREATE INDEX IF NOT EXISTS idx_donations_pledge ON public.donations (pledge_id) WHERE pledge_id IS NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_event_registrations_ticket ON public.event_registrations (ticket_type_id) WHERE ticket_type_id IS NOT NULL;
  `.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  await sql`
    DROP INDEX IF EXISTS public.idx_persons_tenant_household;
    DROP INDEX IF EXISTS public.idx_map_peoples_tags_tag;
    DROP INDEX IF EXISTS public.idx_map_households_tags_tag;
    DROP INDEX IF EXISTS public.idx_map_lists_persons_person;
    DROP INDEX IF EXISTS public.idx_map_lists_households_hh;
    DROP INDEX IF EXISTS public.idx_map_teams_persons_person;
    DROP INDEX IF EXISTS public.idx_map_teams_lists_list;
    DROP INDEX IF EXISTS public.idx_email_comments_email;
    DROP INDEX IF EXISTS public.idx_workflow_enrollments_person;
    DROP INDEX IF EXISTS public.idx_volunteer_shifts_event_ri;
    DROP INDEX IF EXISTS public.idx_volunteer_shifts_person_ri;
    DROP INDEX IF EXISTS public.idx_email_trash_folder;
    DROP INDEX IF EXISTS public.idx_donations_pledge;
    DROP INDEX IF EXISTS public.idx_event_registrations_ticket;
  `.execute(db);
}
