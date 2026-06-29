/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Kysely } from 'kysely';
import { sql } from 'kysely';

/**
 * Corrects ON DELETE behavior across the schema.
 *
 *  - SET NULL  → child is a standalone record that merely references the parent
 *                (reference-move). Must be a single-column FK: a composite SET NULL
 *                would try to null tenant_id (NOT NULL) on PG14.
 *  - CASCADE   → child is meaningless without the parent (join/owned rows). Uses the
 *                composite (id, tenant_id) key for tenant safety where available.
 *
 * persons.household_id is intentionally NOT touched here — it is NOT NULL and is
 * handled in app logic (reassign to the placeholder household inside the delete txn).
 */
export async function up(db: Kysely<any>): Promise<void> {
  // --- Existing NO ACTION → SET NULL (single-column; targets have UNIQUE(id)) ---
  await sql`
    ALTER TABLE public.persons DROP CONSTRAINT IF EXISTS fk_persons_company;
    ALTER TABLE public.persons
      ADD CONSTRAINT fk_persons_company
      FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE SET NULL;
  `.execute(db);

  await sql`
    ALTER TABLE public.teams DROP CONSTRAINT IF EXISTS fk_teams_team_captain;
    ALTER TABLE public.teams
      ADD CONSTRAINT fk_teams_team_captain
      FOREIGN KEY (team_captain_id) REFERENCES public.persons(id) ON DELETE SET NULL;
  `.execute(db);

  await sql`
    ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS fk_tasks_team_id;
    ALTER TABLE public.tasks
      ADD CONSTRAINT fk_tasks_team_id
      FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE SET NULL;
  `.execute(db);

  await sql`
    ALTER TABLE public.data_imports DROP CONSTRAINT IF EXISTS fk_data_imports_tag;
    ALTER TABLE public.data_imports
      ADD CONSTRAINT fk_data_imports_tag
      FOREIGN KEY (tag_id) REFERENCES public.tags(id) ON DELETE SET NULL;
  `.execute(db);

  // --- Existing NO ACTION → CASCADE (join table) ---
  await sql`
    ALTER TABLE public.map_campaigns_users DROP CONSTRAINT IF EXISTS fk_campaign_id;
    ALTER TABLE public.map_campaigns_users
      ADD CONSTRAINT fk_campaign_id
      FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id) ON DELETE CASCADE;
  `.execute(db);

  // --- Standalone UNIQUE(id) needed to target these with single-column SET NULL FKs ---
  // CASCADE: on a DB squashed from a full schema dump these UNIQUE keys already
  // exist and the SET NULL FKs below already depend on them. Dropping with
  // CASCADE removes those dependents (re-created later in this same migration)
  // so the drop/re-add is order-independent and idempotent.
  await sql`
    ALTER TABLE public.event_ticket_types DROP CONSTRAINT IF EXISTS event_ticket_types_id_key CASCADE;
    ALTER TABLE public.event_ticket_types ADD CONSTRAINT event_ticket_types_id_key UNIQUE (id);
  `.execute(db);

  await sql`
    ALTER TABLE public.donation_pledges DROP CONSTRAINT IF EXISTS donation_pledges_id_key CASCADE;
    ALTER TABLE public.donation_pledges ADD CONSTRAINT donation_pledges_id_key UNIQUE (id);
  `.execute(db);

  // --- Missing FKs: events children → CASCADE (composite, tenant-safe) ---
  await sql`
    ALTER TABLE public.event_ticket_types DROP CONSTRAINT IF EXISTS fk_event_ticket_types_event;
    ALTER TABLE public.event_ticket_types
      ADD CONSTRAINT fk_event_ticket_types_event
      FOREIGN KEY (event_id, tenant_id) REFERENCES public.events(id, tenant_id) ON DELETE CASCADE;
  `.execute(db);

  await sql`
    ALTER TABLE public.event_registrations DROP CONSTRAINT IF EXISTS fk_event_registrations_event;
    ALTER TABLE public.event_registrations
      ADD CONSTRAINT fk_event_registrations_event
      FOREIGN KEY (event_id, tenant_id) REFERENCES public.events(id, tenant_id) ON DELETE CASCADE;
  `.execute(db);

  await sql`
    ALTER TABLE public.event_registrations DROP CONSTRAINT IF EXISTS fk_event_registrations_person;
    ALTER TABLE public.event_registrations
      ADD CONSTRAINT fk_event_registrations_person
      FOREIGN KEY (person_id, tenant_id) REFERENCES public.persons(id, tenant_id) ON DELETE CASCADE;
  `.execute(db);

  // --- Missing FKs: SET NULL (single-column; nullable columns) ---
  await sql`
    ALTER TABLE public.event_registrations DROP CONSTRAINT IF EXISTS fk_event_registrations_ticket_type;
    ALTER TABLE public.event_registrations
      ADD CONSTRAINT fk_event_registrations_ticket_type
      FOREIGN KEY (ticket_type_id) REFERENCES public.event_ticket_types(id) ON DELETE SET NULL;
  `.execute(db);

  await sql`
    ALTER TABLE public.donation_pledges DROP CONSTRAINT IF EXISTS fk_donation_pledges_person;
    ALTER TABLE public.donation_pledges
      ADD CONSTRAINT fk_donation_pledges_person
      FOREIGN KEY (person_id) REFERENCES public.persons(id) ON DELETE SET NULL;
  `.execute(db);

  await sql`
    ALTER TABLE public.donations DROP CONSTRAINT IF EXISTS fk_donations_pledge;
    ALTER TABLE public.donations
      ADD CONSTRAINT fk_donations_pledge
      FOREIGN KEY (pledge_id) REFERENCES public.donation_pledges(id) ON DELETE SET NULL;
  `.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  // Drop the newly-added FKs.
  await sql`
    ALTER TABLE public.donations DROP CONSTRAINT IF EXISTS fk_donations_pledge;
    ALTER TABLE public.donation_pledges DROP CONSTRAINT IF EXISTS fk_donation_pledges_person;
    ALTER TABLE public.event_registrations DROP CONSTRAINT IF EXISTS fk_event_registrations_ticket_type;
    ALTER TABLE public.event_registrations DROP CONSTRAINT IF EXISTS fk_event_registrations_person;
    ALTER TABLE public.event_registrations DROP CONSTRAINT IF EXISTS fk_event_registrations_event;
    ALTER TABLE public.event_ticket_types DROP CONSTRAINT IF EXISTS fk_event_ticket_types_event;
  `.execute(db);

  await sql`
    ALTER TABLE public.donation_pledges DROP CONSTRAINT IF EXISTS donation_pledges_id_key;
    ALTER TABLE public.event_ticket_types DROP CONSTRAINT IF EXISTS event_ticket_types_id_key;
  `.execute(db);

  // Restore the original NO ACTION constraints.
  await sql`
    ALTER TABLE public.map_campaigns_users DROP CONSTRAINT IF EXISTS fk_campaign_id;
    ALTER TABLE public.map_campaigns_users
      ADD CONSTRAINT fk_campaign_id
      FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id);
  `.execute(db);

  await sql`
    ALTER TABLE public.data_imports DROP CONSTRAINT IF EXISTS fk_data_imports_tag;
    ALTER TABLE public.data_imports
      ADD CONSTRAINT fk_data_imports_tag
      FOREIGN KEY (tag_id) REFERENCES public.tags(id);
  `.execute(db);

  await sql`
    ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS fk_tasks_team_id;
    ALTER TABLE public.tasks
      ADD CONSTRAINT fk_tasks_team_id
      FOREIGN KEY (team_id) REFERENCES public.teams(id);
  `.execute(db);

  await sql`
    ALTER TABLE public.teams DROP CONSTRAINT IF EXISTS fk_teams_team_captain;
    ALTER TABLE public.teams
      ADD CONSTRAINT fk_teams_team_captain
      FOREIGN KEY (team_captain_id) REFERENCES public.persons(id);
  `.execute(db);

  await sql`
    ALTER TABLE public.persons DROP CONSTRAINT IF EXISTS fk_persons_company;
    ALTER TABLE public.persons
      ADD CONSTRAINT fk_persons_company
      FOREIGN KEY (company_id) REFERENCES public.companies(id);
  `.execute(db);
}
