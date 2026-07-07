import type { Kysely } from 'kysely';
import { sql } from 'kysely';

/**
 * D-1: Drop 11 duplicate foreign-key constraints (schema review 2026-07-06, §3).
 *
 * Seven tables carried two FK constraints over the same column referencing the
 * same parent: an older `fk_*`-named twin (mostly ON DELETE NO ACTION) and a
 * newer `*_fkey`-named twin (ON DELETE CASCADE). The 2026-06-25 fix-ondelete
 * migration added the corrected CASCADE constraints under new names without
 * dropping the originals. The surviving `*_fkey` constraint carries the intended
 * ON DELETE CASCADE; the older twin is dead weight with misleading semantics
 * (every child write pays a double RI check).
 *
 * This drops only the redundant older twin on each column. The tenant / audit
 * FKs on these tables (fk_*_tenant, fk_*_createdby, fk_email_comments_author,
 * etc.) are NOT duplicates and are left in place.
 *
 * Idempotent: DROP ... IF EXISTS is a no-op once schema.sql is refreshed (the
 * dropped twins no longer appear in the baseline dump).
 */
export async function up(db: Kysely<any>): Promise<void> {
  await sql`
    ALTER TABLE public.email_comments       DROP CONSTRAINT IF EXISTS fk_email_comments_email;
    ALTER TABLE public.email_trash          DROP CONSTRAINT IF EXISTS fk_email_trash_email;
    ALTER TABLE public.map_lists_households DROP CONSTRAINT IF EXISTS fk_map_lists_households_household;
    ALTER TABLE public.map_lists_households DROP CONSTRAINT IF EXISTS fk_map_lists_households_list;
    ALTER TABLE public.map_lists_persons    DROP CONSTRAINT IF EXISTS fk_map_lists_persons_person;
    ALTER TABLE public.map_lists_persons    DROP CONSTRAINT IF EXISTS fk_map_lists_persons_list;
    ALTER TABLE public.map_teams_lists      DROP CONSTRAINT IF EXISTS fk_map_teams_lists_list;
    ALTER TABLE public.map_teams_lists      DROP CONSTRAINT IF EXISTS fk_map_teams_lists_team;
    ALTER TABLE public.map_teams_persons    DROP CONSTRAINT IF EXISTS fk_map_teams_persons_person;
    ALTER TABLE public.map_teams_persons    DROP CONSTRAINT IF EXISTS fk_map_teams_persons_team;
    ALTER TABLE public.profiles             DROP CONSTRAINT IF EXISTS fk_profiles_auth_id;
  `.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  // Restore the older twins with their original ON DELETE behavior. email_trash's
  // twin was CASCADE originally; the rest were NO ACTION (bare REFERENCES).
  await sql`
    ALTER TABLE public.email_comments
      ADD CONSTRAINT fk_email_comments_email FOREIGN KEY (email_id) REFERENCES public.emails(id);
    ALTER TABLE public.email_trash
      ADD CONSTRAINT fk_email_trash_email FOREIGN KEY (email_id) REFERENCES public.emails(id) ON DELETE CASCADE;
    ALTER TABLE public.map_lists_households
      ADD CONSTRAINT fk_map_lists_households_household FOREIGN KEY (household_id) REFERENCES public.households(id);
    ALTER TABLE public.map_lists_households
      ADD CONSTRAINT fk_map_lists_households_list FOREIGN KEY (list_id) REFERENCES public.lists(id);
    ALTER TABLE public.map_lists_persons
      ADD CONSTRAINT fk_map_lists_persons_person FOREIGN KEY (person_id) REFERENCES public.persons(id);
    ALTER TABLE public.map_lists_persons
      ADD CONSTRAINT fk_map_lists_persons_list FOREIGN KEY (list_id) REFERENCES public.lists(id);
    ALTER TABLE public.map_teams_lists
      ADD CONSTRAINT fk_map_teams_lists_list FOREIGN KEY (list_id) REFERENCES public.lists(id);
    ALTER TABLE public.map_teams_lists
      ADD CONSTRAINT fk_map_teams_lists_team FOREIGN KEY (team_id) REFERENCES public.teams(id);
    ALTER TABLE public.map_teams_persons
      ADD CONSTRAINT fk_map_teams_persons_person FOREIGN KEY (person_id) REFERENCES public.persons(id);
    ALTER TABLE public.map_teams_persons
      ADD CONSTRAINT fk_map_teams_persons_team FOREIGN KEY (team_id) REFERENCES public.teams(id);
    ALTER TABLE public.profiles
      ADD CONSTRAINT fk_profiles_auth_id FOREIGN KEY (auth_id) REFERENCES public.authusers(id);
  `.execute(db);
}
