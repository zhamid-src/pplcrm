/* eslint-disable @typescript-eslint/no-explicit-any */
import { Kysely, sql } from 'kysely';

/**
 * Comprehensive FK / CASCADE cleanup pass.
 *
 * Goals
 * ─────
 * 1. Add ON DELETE CASCADE to every junction (many-to-many mapping) table so
 *    that rows with no meaningful existence without their parents are cleaned up
 *    automatically.
 * 2. Add ON DELETE CASCADE to strict child tables (task subtasks/comments,
 *    shifts, sessions, profiles, notifications) for the same reason.
 * 3. Change donations.person_id from CASCADE → SET NULL so that financial
 *    records are NEVER silently destroyed when a contact is deleted.
 *
 * IMPORTANT: Before adding each FK constraint, orphaned rows (referencing
 * non-existent parents) are purged first. PostgreSQL validates ALL existing
 * rows when a new constraint is added, so pre-existing data integrity debt
 * will cause the migration to fail without this cleanup.
 *
 * All DROP CONSTRAINT statements use IF EXISTS so the migration is safe to
 * run even if a constraint was already added manually in a hotfix.
 */
export async function up(db: Kysely<any>): Promise<void> {
  console.log('======= Migrating up: comprehensive FK cascade cleanup ========');

  // ── Junction tables ────────────────────────────────────────────────────────

  // map_peoples_tags: purge orphans, then cascade when person or tag is deleted
  await sql`DELETE FROM map_peoples_tags WHERE person_id NOT IN (SELECT id FROM persons)`.execute(db);
  await sql`DELETE FROM map_peoples_tags WHERE tag_id    NOT IN (SELECT id FROM tags)`.execute(db);
  await sql`
    ALTER TABLE map_peoples_tags
      DROP CONSTRAINT IF EXISTS map_peoples_tags_person_id_fkey,
      ADD CONSTRAINT map_peoples_tags_person_id_fkey
        FOREIGN KEY (person_id) REFERENCES persons(id) ON DELETE CASCADE,
      DROP CONSTRAINT IF EXISTS map_peoples_tags_tag_id_fkey,
      ADD CONSTRAINT map_peoples_tags_tag_id_fkey
        FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
  `.execute(db);

  // map_households_tags – tag_id side (household_id CASCADE was added in 2026-07-07)
  await sql`DELETE FROM map_households_tags WHERE tag_id NOT IN (SELECT id FROM tags)`.execute(db);
  await sql`
    ALTER TABLE map_households_tags
      DROP CONSTRAINT IF EXISTS map_households_tags_tag_id_fkey,
      ADD CONSTRAINT map_households_tags_tag_id_fkey
        FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
  `.execute(db);

  // map_lists_persons: purge orphans, then cascade when person or list is deleted
  await sql`DELETE FROM map_lists_persons WHERE person_id NOT IN (SELECT id FROM persons)`.execute(db);
  await sql`DELETE FROM map_lists_persons WHERE list_id   NOT IN (SELECT id FROM lists)`.execute(db);
  await sql`
    ALTER TABLE map_lists_persons
      DROP CONSTRAINT IF EXISTS map_lists_persons_person_id_fkey,
      ADD CONSTRAINT map_lists_persons_person_id_fkey
        FOREIGN KEY (person_id) REFERENCES persons(id) ON DELETE CASCADE,
      DROP CONSTRAINT IF EXISTS map_lists_persons_list_id_fkey,
      ADD CONSTRAINT map_lists_persons_list_id_fkey
        FOREIGN KEY (list_id) REFERENCES lists(id) ON DELETE CASCADE
  `.execute(db);

  // map_lists_households – list_id side (household_id CASCADE was added in 2026-07-07)
  await sql`DELETE FROM map_lists_households WHERE list_id NOT IN (SELECT id FROM lists)`.execute(db);
  await sql`
    ALTER TABLE map_lists_households
      DROP CONSTRAINT IF EXISTS map_lists_households_list_id_fkey,
      ADD CONSTRAINT map_lists_households_list_id_fkey
        FOREIGN KEY (list_id) REFERENCES lists(id) ON DELETE CASCADE
  `.execute(db);

  // map_teams_persons: purge orphans, then cascade when person or team is deleted
  await sql`DELETE FROM map_teams_persons WHERE person_id NOT IN (SELECT id FROM persons)`.execute(db);
  await sql`DELETE FROM map_teams_persons WHERE team_id   NOT IN (SELECT id FROM teams)`.execute(db);
  await sql`
    ALTER TABLE map_teams_persons
      DROP CONSTRAINT IF EXISTS map_teams_persons_person_id_fkey,
      ADD CONSTRAINT map_teams_persons_person_id_fkey
        FOREIGN KEY (person_id) REFERENCES persons(id) ON DELETE CASCADE,
      DROP CONSTRAINT IF EXISTS map_teams_persons_team_id_fkey,
      ADD CONSTRAINT map_teams_persons_team_id_fkey
        FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
  `.execute(db);

  // map_teams_lists: purge orphans, then cascade when team or list is deleted
  await sql`DELETE FROM map_teams_lists WHERE team_id NOT IN (SELECT id FROM teams)`.execute(db);
  await sql`DELETE FROM map_teams_lists WHERE list_id NOT IN (SELECT id FROM lists)`.execute(db);
  await sql`
    ALTER TABLE map_teams_lists
      DROP CONSTRAINT IF EXISTS map_teams_lists_team_id_fkey,
      ADD CONSTRAINT map_teams_lists_team_id_fkey
        FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
      DROP CONSTRAINT IF EXISTS map_teams_lists_list_id_fkey,
      ADD CONSTRAINT map_teams_lists_list_id_fkey
        FOREIGN KEY (list_id) REFERENCES lists(id) ON DELETE CASCADE
  `.execute(db);

  // ── Strict child tables ────────────────────────────────────────────────────

  // volunteer_shifts: purge orphans, then cascade when event or person is deleted
  await sql`DELETE FROM volunteer_shifts WHERE event_id  NOT IN (SELECT id FROM volunteer_events)`.execute(db);
  await sql`DELETE FROM volunteer_shifts WHERE person_id NOT IN (SELECT id FROM persons)`.execute(db);
  await sql`
    ALTER TABLE volunteer_shifts
      DROP CONSTRAINT IF EXISTS fk_shifts_event,
      ADD CONSTRAINT fk_shifts_event
        FOREIGN KEY (event_id) REFERENCES volunteer_events(id) ON DELETE CASCADE,
      DROP CONSTRAINT IF EXISTS fk_shifts_person,
      ADD CONSTRAINT fk_shifts_person
        FOREIGN KEY (person_id) REFERENCES persons(id) ON DELETE CASCADE
  `.execute(db);

  // task_subtasks, task_comments, task_attachments
  await sql`DELETE FROM task_subtasks   WHERE task_id NOT IN (SELECT id FROM tasks)`.execute(db);
  await sql`DELETE FROM task_comments   WHERE task_id NOT IN (SELECT id FROM tasks)`.execute(db);
  await sql`DELETE FROM task_attachments WHERE task_id NOT IN (SELECT id FROM tasks)`.execute(db);
  await sql`
    ALTER TABLE task_subtasks
      DROP CONSTRAINT IF EXISTS task_subtasks_task_id_fkey,
      ADD CONSTRAINT task_subtasks_task_id_fkey
        FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
  `.execute(db);

  await sql`
    ALTER TABLE task_comments
      DROP CONSTRAINT IF EXISTS task_comments_task_id_fkey,
      ADD CONSTRAINT task_comments_task_id_fkey
        FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
  `.execute(db);

  await sql`
    ALTER TABLE task_attachments
      DROP CONSTRAINT IF EXISTS task_attachments_task_id_fkey,
      ADD CONSTRAINT task_attachments_task_id_fkey
        FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
  `.execute(db);

  // email_comments, email_trash
  await sql`DELETE FROM email_comments WHERE email_id NOT IN (SELECT id FROM emails)`.execute(db);
  await sql`DELETE FROM email_trash    WHERE email_id NOT IN (SELECT id FROM emails)`.execute(db);
  await sql`
    ALTER TABLE email_comments
      DROP CONSTRAINT IF EXISTS email_comments_email_id_fkey,
      ADD CONSTRAINT email_comments_email_id_fkey
        FOREIGN KEY (email_id) REFERENCES emails(id) ON DELETE CASCADE
  `.execute(db);

  await sql`
    ALTER TABLE email_trash
      DROP CONSTRAINT IF EXISTS email_trash_email_id_fkey,
      ADD CONSTRAINT email_trash_email_id_fkey
        FOREIGN KEY (email_id) REFERENCES emails(id) ON DELETE CASCADE
  `.execute(db);

  // sessions: purge orphaned sessions before adding FK
  await sql`DELETE FROM sessions      WHERE user_id NOT IN (SELECT id FROM authusers)`.execute(db);
  await sql`
    ALTER TABLE sessions
      DROP CONSTRAINT IF EXISTS sessions_user_id_fkey,
      ADD CONSTRAINT sessions_user_id_fkey
        FOREIGN KEY (user_id) REFERENCES authusers(id) ON DELETE CASCADE
  `.execute(db);

  // profiles: purge orphaned profiles before adding FK
  await sql`DELETE FROM profiles      WHERE auth_id NOT IN (SELECT id FROM authusers)`.execute(db);
  await sql`
    ALTER TABLE profiles
      DROP CONSTRAINT IF EXISTS profiles_auth_id_fkey,
      DROP CONSTRAINT IF EXISTS profile_id_authusers,
      ADD CONSTRAINT profiles_auth_id_fkey
        FOREIGN KEY (auth_id) REFERENCES authusers(id) ON DELETE CASCADE
  `.execute(db);

  // notifications: purge orphaned notifications before adding FK
  await sql`DELETE FROM notifications WHERE user_id NOT IN (SELECT id FROM authusers)`.execute(db);
  await sql`
    ALTER TABLE notifications
      DROP CONSTRAINT IF EXISTS fk_notifications_user,
      ADD CONSTRAINT fk_notifications_user
        FOREIGN KEY (user_id) REFERENCES authusers(id) ON DELETE CASCADE
  `.execute(db);

  // ── Financial records: NEVER cascade ──────────────────────────────────────
  //
  // Donations must be preserved even if the donor contact is later deleted.
  // Changing CASCADE → SET NULL means the donation row survives and
  // person_id becomes NULL, which the reporting layer must handle gracefully.
  await sql`
    ALTER TABLE donations
      DROP CONSTRAINT IF EXISTS fk_donations_person,
      ADD CONSTRAINT fk_donations_person
        FOREIGN KEY (person_id) REFERENCES persons(id) ON DELETE SET NULL
  `.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  console.log('====== Migrating down: comprehensive FK cascade cleanup =======');

  // Restore junction table constraints to no-action (original state)
  for (const [table, col, ref, constraint] of [
    ['map_peoples_tags', 'person_id', 'persons(id)', 'map_peoples_tags_person_id_fkey'],
    ['map_peoples_tags', 'tag_id', 'tags(id)', 'map_peoples_tags_tag_id_fkey'],
    ['map_households_tags', 'tag_id', 'tags(id)', 'map_households_tags_tag_id_fkey'],
    ['map_lists_persons', 'person_id', 'persons(id)', 'map_lists_persons_person_id_fkey'],
    ['map_lists_persons', 'list_id', 'lists(id)', 'map_lists_persons_list_id_fkey'],
    ['map_lists_households', 'list_id', 'lists(id)', 'map_lists_households_list_id_fkey'],
    ['map_teams_persons', 'person_id', 'persons(id)', 'map_teams_persons_person_id_fkey'],
    ['map_teams_persons', 'team_id', 'teams(id)', 'map_teams_persons_team_id_fkey'],
    ['map_teams_lists', 'team_id', 'teams(id)', 'map_teams_lists_team_id_fkey'],
    ['map_teams_lists', 'list_id', 'lists(id)', 'map_teams_lists_list_id_fkey'],
  ] as const) {
    await sql`
      ALTER TABLE ${sql.table(table)}
        DROP CONSTRAINT IF EXISTS ${sql.id(constraint)},
        ADD CONSTRAINT ${sql.id(constraint)}
          FOREIGN KEY (${sql.ref(col)}) REFERENCES ${sql.table(ref)}
    `.execute(db);
  }

  // Restore strict child table constraints (drop → no constraint, since originals had none)
  await sql`ALTER TABLE volunteer_shifts DROP CONSTRAINT IF EXISTS fk_shifts_event`.execute(db);
  await sql`ALTER TABLE volunteer_shifts DROP CONSTRAINT IF EXISTS fk_shifts_person`.execute(db);
  await sql`ALTER TABLE task_subtasks DROP CONSTRAINT IF EXISTS task_subtasks_task_id_fkey`.execute(db);
  await sql`ALTER TABLE task_comments DROP CONSTRAINT IF EXISTS task_comments_task_id_fkey`.execute(db);
  await sql`ALTER TABLE task_attachments DROP CONSTRAINT IF EXISTS task_attachments_task_id_fkey`.execute(db);
  await sql`ALTER TABLE email_comments DROP CONSTRAINT IF EXISTS email_comments_email_id_fkey`.execute(db);
  await sql`ALTER TABLE email_trash DROP CONSTRAINT IF EXISTS email_trash_email_id_fkey`.execute(db);
  await sql`ALTER TABLE sessions DROP CONSTRAINT IF EXISTS sessions_user_id_fkey`.execute(db);
  await sql`ALTER TABLE notifications DROP CONSTRAINT IF EXISTS fk_notifications_user`.execute(db);

  // Restore profiles constraint (no action)
  await sql`
    ALTER TABLE profiles
      DROP CONSTRAINT IF EXISTS profiles_auth_id_fkey,
      ADD CONSTRAINT profile_id_authusers
        FOREIGN KEY (id) REFERENCES authusers(id)
  `.execute(db);

  // Restore donations to CASCADE (previous state)
  await sql`
    ALTER TABLE donations
      DROP CONSTRAINT IF EXISTS fk_donations_person,
      ADD CONSTRAINT fk_donations_person
        FOREIGN KEY (person_id) REFERENCES persons(id) ON DELETE CASCADE
  `.execute(db);
}
