import type { Kysely } from 'kysely';
import { sql } from 'kysely';

/**
 * Retire the last two system tags into first-class person status (Campaigns §15
 * doctrine: "anything with a fixed enum, a single value per person, machine
 * updates, or send/knock logic is a structured concept, not a tag"). Supporter
 * level, do-not-contact, subscriptions and donor were already retired the same
 * way; `volunteer` and `staff` were the holdouts.
 *
 * Adds `persons.volunteer_status` / `persons.staff_status` (nullable enum
 * columns; NULL = "not a volunteer / not staff"), backfills them from the two
 * system tags (any tagged person → 'active', since the tag was binary), then
 * deletes the `volunteer`, `staff` AND `vip` tags together with their mapping
 * rows. `vip` carried no logic and is simply removed.
 *
 * The tag deletion is intentionally irreversible: down() restores the schema
 * shape (columns/constraints/indexes) only, not the retired tag rows —
 * consistent with the earlier tag retirements squashed into the baseline.
 */

const RETIRED_TAGS = sql`(LOWER(t.name) IN ('volunteer', 'staff', 'vip') AND t.type = 'tag')`;

export async function up(db: Kysely<any>): Promise<void> {
  // -- New first-class columns (global, like persons.do_not_contact).
  await sql`ALTER TABLE public.persons ADD COLUMN IF NOT EXISTS volunteer_status text`.execute(db);
  await sql`ALTER TABLE public.persons ADD COLUMN IF NOT EXISTS staff_status text`.execute(db);

  await sql`ALTER TABLE public.persons DROP CONSTRAINT IF EXISTS chk_persons_volunteer_status`.execute(db);
  await sql`
    ALTER TABLE public.persons
      ADD CONSTRAINT chk_persons_volunteer_status
      CHECK ((volunteer_status IS NULL) OR (volunteer_status = ANY (ARRAY['prospective'::text, 'active'::text, 'inactive'::text, 'former'::text])))
  `.execute(db);
  await sql`ALTER TABLE public.persons DROP CONSTRAINT IF EXISTS chk_persons_staff_status`.execute(db);
  await sql`
    ALTER TABLE public.persons
      ADD CONSTRAINT chk_persons_staff_status
      CHECK ((staff_status IS NULL) OR (staff_status = ANY (ARRAY['active'::text, 'inactive'::text, 'former'::text])))
  `.execute(db);

  // -- Backfill from the two system tags. The tag was binary (present/absent),
  // -- so the only faithful landing spot is 'active'. Only fill where NULL.
  await sql`
    UPDATE public.persons p SET volunteer_status = 'active'
      FROM public.map_peoples_tags m
      JOIN public.tags t ON t.id = m.tag_id AND t.tenant_id = m.tenant_id
     WHERE m.person_id = p.id AND m.tenant_id = p.tenant_id
       AND LOWER(t.name) = 'volunteer' AND t.type = 'tag'
       AND p.volunteer_status IS NULL
  `.execute(db);
  await sql`
    UPDATE public.persons p SET staff_status = 'active'
      FROM public.map_peoples_tags m
      JOIN public.tags t ON t.id = m.tag_id AND t.tenant_id = m.tenant_id
     WHERE m.person_id = p.id AND m.tenant_id = p.tenant_id
       AND LOWER(t.name) = 'staff' AND t.type = 'tag'
       AND p.staff_status IS NULL
  `.execute(db);

  // -- Retire the tags: drop mapping rows (persons + defensively households),
  // -- null out import references, then delete the tag rows themselves.
  await sql`
    DELETE FROM public.map_peoples_tags m USING public.tags t
     WHERE m.tag_id = t.id AND m.tenant_id = t.tenant_id AND ${RETIRED_TAGS}
  `.execute(db);
  await sql`
    DELETE FROM public.map_households_tags m USING public.tags t
     WHERE m.tag_id = t.id AND m.tenant_id = t.tenant_id AND ${RETIRED_TAGS}
  `.execute(db);
  await sql`
    UPDATE public.data_imports d SET tag_id = NULL
      FROM public.tags t
     WHERE d.tag_id = t.id AND d.tenant_id = t.tenant_id AND ${RETIRED_TAGS}
  `.execute(db);
  await sql`
    DELETE FROM public.tags t
     WHERE LOWER(t.name) IN ('volunteer', 'staff', 'vip') AND t.type = 'tag'
  `.execute(db);

  // -- Partial indexes for the team-membership gate and grid status filter.
  await sql`
    CREATE INDEX IF NOT EXISTS idx_persons_tenant_volunteer_status
      ON public.persons (tenant_id, volunteer_status) WHERE volunteer_status IS NOT NULL
  `.execute(db);
  await sql`
    CREATE INDEX IF NOT EXISTS idx_persons_tenant_staff_status
      ON public.persons (tenant_id, staff_status) WHERE staff_status IS NOT NULL
  `.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  await sql`DROP INDEX IF EXISTS public.idx_persons_tenant_staff_status`.execute(db);
  await sql`DROP INDEX IF EXISTS public.idx_persons_tenant_volunteer_status`.execute(db);
  await sql`ALTER TABLE public.persons DROP CONSTRAINT IF EXISTS chk_persons_staff_status`.execute(db);
  await sql`ALTER TABLE public.persons DROP CONSTRAINT IF EXISTS chk_persons_volunteer_status`.execute(db);
  await sql`ALTER TABLE public.persons DROP COLUMN IF EXISTS staff_status`.execute(db);
  await sql`ALTER TABLE public.persons DROP COLUMN IF EXISTS volunteer_status`.execute(db);
}
