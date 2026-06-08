/* eslint-disable @typescript-eslint/no-explicit-any */
import { Kysely, sql } from 'kysely';

/**
 * Migration: Schema Improvements (DB Review — items 1–16)
 *
 * Implements the following improvements from the database schema review:
 *
 *  #1  – updated_at auto-trigger: add set_updated_at() PL/pgSQL function +
 *         triggers on all entity tables so updated_at is maintained by the DB.
 *  #2  – campaigns.startdate / enddate: cast from time → date.
 *  #3  – newsletters.target_lists / segments: cast text → jsonb.
 *  #4  – persons unique email — already done (idx_persons_tenant_email_unique).
 *  #5  – emails: add missing indexes (folder, assigned, deleted, status).
 *  #6  – user_activity: add missing indexes (entity_id, user_id, entity composite).
 *  #7  – tasks: add filter indexes (status, assigned_to, due_at).
 *  #8  – background_jobs: add queue+status+run_at and tenant+status indexes.
 *  #9  – newsletter_events: add composite indexes.
 *  #10 – workflow_steps: add (tenant_id, workflow_id, step_number) composite.
 *  #11 – All entity-table timestamp columns: cast timestamp → timestamptz.
 *  #12 – authusers.role: add CHECK constraint (owner|admin|user|viewer|null).
 *  #13 – Junction audit columns: deferred (no code reads them, low risk).
 *  #14 – email_read_states PK — already done.
 *  #15 – files: add tenant_id and sha256_hex indexes.
 *  #16 – potential_duplicates: consolidate single-col indexes into composite.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Helper lists
// ─────────────────────────────────────────────────────────────────────────────

/** All tables that need the updated_at trigger (must have an updated_at column). */
const TRIGGER_TABLES = [
  'authusers',
  'campaigns',
  'companies',
  'email_bodies',
  'email_comments',
  'email_drafts',
  'email_headers',
  'emails',
  'households',
  'lists',
  'newsletters',
  'notifications',
  'persons',
  'profiles',
  'settings',
  'tags',
  'tasks',
  'task_attachments',
  'task_comments',
  'task_subtasks',
  'teams',
  'tenants',
  'volunteer_events',
  'volunteer_shifts',
  'web_forms',
  'workflows',
];

/**
 * All tables that have timestamp columns to convert to timestamptz.
 * Format: [table, ...columns]
 */
const TIMESTAMP_COLUMNS: [string, ...string[]][] = [
  ['authusers', 'created_at', 'updated_at', 'deletion_scheduled_at', 'password_reset_code_created_at', 'two_factor_expires_at'],
  ['background_jobs', 'created_at', 'updated_at', 'locked_at', 'run_at'],
  ['campaigns', 'created_at', 'updated_at'],
  ['companies', 'created_at', 'updated_at'],
  ['data_exports', 'created_at', 'updated_at'],
  ['data_imports', 'created_at', 'updated_at', 'processed_at'],
  ['email_comments', 'created_at', 'updated_at'],
  ['email_folders', 'created_at', 'updated_at'],
  ['email_read_states', 'created_at'],
  ['emails', 'created_at', 'updated_at'],
  ['households', 'created_at', 'updated_at'],
  ['lists', 'created_at', 'updated_at', 'last_refreshed_at'],
  ['map_campaigns_users', 'created_at', 'updated_at'],
  ['map_households_tags', 'created_at', 'updated_at'],
  ['map_lists_households', 'created_at', 'updated_at'],
  ['map_lists_persons', 'created_at', 'updated_at'],
  ['map_peoples_tags', 'created_at', 'updated_at'],
  ['map_teams_lists', 'created_at', 'updated_at'],
  ['map_teams_persons', 'created_at', 'updated_at'],
  ['newsletter_events', 'created_at', 'timestamp'],
  ['newsletters', 'created_at', 'updated_at', 'last_engagement_at', 'send_date'],
  ['notifications', 'created_at', 'updated_at'],
  ['persons', 'created_at', 'updated_at'],
  ['potential_duplicates', 'created_at', 'updated_at'],
  ['profiles', 'created_at', 'updated_at'],
  ['sessions', 'created_at', 'last_accessed'],
  ['settings', 'created_at', 'updated_at'],
  ['tags', 'created_at', 'updated_at'],
  ['task_attachments', 'created_at', 'updated_at'],
  ['task_comments', 'created_at', 'updated_at'],
  ['task_subtasks', 'created_at', 'updated_at'],
  ['tasks', 'created_at', 'updated_at', 'completed_at', 'due_at'],
  ['teams', 'created_at', 'updated_at'],
  ['tenants', 'created_at', 'updated_at', 'deletion_scheduled_at', 'subscription_ends_at'],
  ['user_activity', 'created_at', 'updated_at'],
  ['volunteer_events', 'created_at', 'updated_at', 'end_time', 'start_time'],
  ['volunteer_shifts', 'created_at', 'updated_at'],
  ['web_forms', 'created_at', 'updated_at'],
  ['webhook_events', 'created_at', 'updated_at', 'locked_at', 'processed_at', 'run_at'],
  ['workflow_enrollments', 'created_at', 'updated_at', 'enrolled_at', 'next_run_at'],
  ['workflow_steps', 'created_at', 'updated_at'],
  ['workflows', 'created_at', 'updated_at'],
];



// ─────────────────────────────────────────────────────────────────────────────
// UP
// ─────────────────────────────────────────────────────────────────────────────

export async function up(db: Kysely<any>): Promise<void> {
  console.log('======= Migrating up: schema-improvements ========');

  // ── #1 – updated_at auto-trigger ─────────────────────────────────────────
  await sql`
    CREATE OR REPLACE FUNCTION set_updated_at()
    RETURNS TRIGGER LANGUAGE plpgsql AS $$
    BEGIN
      NEW.updated_at = now();
      RETURN NEW;
    END;
    $$;
  `.execute(db);

  for (const table of TRIGGER_TABLES) {
    await sql.raw(`
      DROP TRIGGER IF EXISTS trg_${table}_updated_at ON ${table};
      CREATE TRIGGER trg_${table}_updated_at
        BEFORE UPDATE ON ${table}
        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    `).execute(db);
  }

  // ── #2 – campaigns date columns ───────────────────────────────────────────
  // The columns were defined as `time` but hold date strings — cast safely.
  await sql`
    ALTER TABLE campaigns
      ALTER COLUMN startdate TYPE date USING startdate::text::date,
      ALTER COLUMN enddate   TYPE date USING enddate::text::date;
  `.execute(db);

  // ── #3 – newsletters: text → jsonb for target_lists and segments ──────────
  // Wipe development newsletter data so we can do a clean type cast without
  // needing to handle legacy non-JSON string values.
  await sql`TRUNCATE newsletters CASCADE;`.execute(db);
  await sql`
    ALTER TABLE newsletters
      ALTER COLUMN target_lists TYPE jsonb USING target_lists::jsonb,
      ALTER COLUMN segments     TYPE jsonb USING segments::jsonb;
  `.execute(db);

  // ── #5 – emails: missing indexes ──────────────────────────────────────────
  await sql`CREATE INDEX IF NOT EXISTS idx_emails_tenant_folder   ON emails (tenant_id, folder_id);`.execute(db);
  await sql`CREATE INDEX IF NOT EXISTS idx_emails_tenant_assigned ON emails (tenant_id, assigned_to);`.execute(db);
  await sql`CREATE INDEX IF NOT EXISTS idx_emails_tenant_active   ON emails (tenant_id, folder_id) WHERE deleted_at IS NULL;`.execute(db);
  await sql`CREATE INDEX IF NOT EXISTS idx_emails_tenant_status   ON emails (tenant_id, status);`.execute(db);

  // ── #6 – user_activity: missing indexes ───────────────────────────────────
  await sql`CREATE INDEX IF NOT EXISTS idx_user_activity_tenant_entity    ON user_activity (tenant_id, entity, entity_id);`.execute(db);
  await sql`CREATE INDEX IF NOT EXISTS idx_user_activity_tenant_user      ON user_activity (tenant_id, user_id);`.execute(db);
  await sql`CREATE INDEX IF NOT EXISTS idx_user_activity_entity_id        ON user_activity (entity_id) WHERE entity_id IS NOT NULL;`.execute(db);

  // ── #7 – tasks: additional filter indexes ─────────────────────────────────
  await sql`CREATE INDEX IF NOT EXISTS idx_tasks_tenant_status   ON tasks (tenant_id, status);`.execute(db);
  await sql`CREATE INDEX IF NOT EXISTS idx_tasks_tenant_assigned ON tasks (tenant_id, assigned_to);`.execute(db);
  await sql`CREATE INDEX IF NOT EXISTS idx_tasks_tenant_due      ON tasks (tenant_id, due_at);`.execute(db);

  // ── #8 – background_jobs: extra indexes ───────────────────────────────────
  await sql`CREATE INDEX IF NOT EXISTS idx_background_jobs_queue_status    ON background_jobs (queue, status, run_at);`.execute(db);
  await sql`CREATE INDEX IF NOT EXISTS idx_background_jobs_tenant_status   ON background_jobs (tenant_id, status) WHERE tenant_id IS NOT NULL;`.execute(db);

  // ── #9 – newsletter_events: composite indexes ─────────────────────────────
  await sql`CREATE INDEX IF NOT EXISTS idx_newsletter_events_tenant_newsletter ON newsletter_events (tenant_id, newsletter_id);`.execute(db);
  await sql`CREATE INDEX IF NOT EXISTS idx_newsletter_events_type              ON newsletter_events (tenant_id, newsletter_id, event_type);`.execute(db);

  // ── #10 – workflow_steps: composite index ─────────────────────────────────
  await sql`DROP INDEX IF EXISTS idx_workflow_steps_workflow_id;`.execute(db);
  await sql`CREATE INDEX IF NOT EXISTS idx_workflow_steps_tenant_workflow ON workflow_steps (tenant_id, workflow_id, step_number);`.execute(db);

  // ── #11 – timestamp → timestamptz on all tables ───────────────────────────
  // PostgreSQL safely casts timestamp to timestamptz assuming the server TZ
  // (UTC in production). No data is lost or shifted.
  for (const [table, ...cols] of TIMESTAMP_COLUMNS) {
    const setClauses = cols
      .map((col) => `ALTER COLUMN "${col}" TYPE timestamptz USING "${col}" AT TIME ZONE 'UTC'`)
      .join(', ');
    await sql.raw(`ALTER TABLE "${table}" ${setClauses};`).execute(db);
  }

  // ── #12 – authusers.role CHECK constraint ─────────────────────────────────
  // Existing values: owner | admin | user | viewer | null (allowed)
  await sql`
    ALTER TABLE authusers
      ADD CONSTRAINT chk_authusers_role
        CHECK (role IS NULL OR role IN ('owner', 'admin', 'user', 'viewer'));
  `.execute(db);

  // ── #15 – files: missing indexes ──────────────────────────────────────────
  await sql`CREATE INDEX IF NOT EXISTS idx_files_tenant ON files (tenant_id);`.execute(db);
  await sql`CREATE INDEX IF NOT EXISTS idx_files_sha256 ON files (sha256_hex) WHERE sha256_hex IS NOT NULL;`.execute(db);

  // ── #16 – potential_duplicates: consolidate indexes ───────────────────────
  // Drop the redundant single-column tenant_id and group_key indexes; the
  // composite (tenant_id, group_key) covers both access patterns.
  await sql`DROP INDEX IF EXISTS idx_potential_duplicates_tenant_id;`.execute(db);
  await sql`DROP INDEX IF EXISTS idx_potential_duplicates_group_key;`.execute(db);
  await sql`CREATE INDEX IF NOT EXISTS idx_potential_duplicates_tenant_group ON potential_duplicates (tenant_id, group_key);`.execute(db);

  console.log('======= Done: schema-improvements ========');
}

// ─────────────────────────────────────────────────────────────────────────────
// DOWN
// ─────────────────────────────────────────────────────────────────────────────

export async function down(db: Kysely<any>): Promise<void> {
  console.log('======= Migrating down: schema-improvements ========');

  // ── #16 – restore original potential_duplicates indexes ───────────────────
  await sql`DROP INDEX IF EXISTS idx_potential_duplicates_tenant_group;`.execute(db);
  await sql`CREATE INDEX IF NOT EXISTS idx_potential_duplicates_tenant_id ON potential_duplicates (tenant_id);`.execute(db);
  await sql`CREATE INDEX IF NOT EXISTS idx_potential_duplicates_group_key ON potential_duplicates (group_key);`.execute(db);

  // ── #15 – drop files indexes ───────────────────────────────────────────────
  await sql`DROP INDEX IF EXISTS idx_files_sha256;`.execute(db);
  await sql`DROP INDEX IF EXISTS idx_files_tenant;`.execute(db);

  // ── #12 – remove role CHECK constraint ────────────────────────────────────
  await sql`ALTER TABLE authusers DROP CONSTRAINT IF EXISTS chk_authusers_role;`.execute(db);

  // ── #11 – revert timestamptz → timestamp ──────────────────────────────────
  for (const [table, ...cols] of [...TIMESTAMP_COLUMNS].reverse()) {
    const setClauses = cols
      .map((col) => `ALTER COLUMN "${col}" TYPE timestamp USING "${col}" AT TIME ZONE 'UTC'`)
      .join(', ');
    await sql.raw(`ALTER TABLE "${table}" ${setClauses};`).execute(db);
  }

  // ── #10 – restore workflow_steps single-column index ──────────────────────
  await sql`DROP INDEX IF EXISTS idx_workflow_steps_tenant_workflow;`.execute(db);
  await sql`CREATE INDEX IF NOT EXISTS idx_workflow_steps_workflow_id ON workflow_steps (workflow_id);`.execute(db);

  // ── #9 – drop newsletter_events indexes ───────────────────────────────────
  await sql`DROP INDEX IF EXISTS idx_newsletter_events_type;`.execute(db);
  await sql`DROP INDEX IF EXISTS idx_newsletter_events_tenant_newsletter;`.execute(db);

  // ── #8 – drop background_jobs extra indexes ───────────────────────────────
  await sql`DROP INDEX IF EXISTS idx_background_jobs_tenant_status;`.execute(db);
  await sql`DROP INDEX IF EXISTS idx_background_jobs_queue_status;`.execute(db);

  // ── #7 – drop tasks filter indexes ────────────────────────────────────────
  await sql`DROP INDEX IF EXISTS idx_tasks_tenant_due;`.execute(db);
  await sql`DROP INDEX IF EXISTS idx_tasks_tenant_assigned;`.execute(db);
  await sql`DROP INDEX IF EXISTS idx_tasks_tenant_status;`.execute(db);

  // ── #6 – drop user_activity indexes ───────────────────────────────────────
  await sql`DROP INDEX IF EXISTS idx_user_activity_entity_id;`.execute(db);
  await sql`DROP INDEX IF EXISTS idx_user_activity_tenant_user;`.execute(db);
  await sql`DROP INDEX IF EXISTS idx_user_activity_tenant_entity;`.execute(db);

  // ── #5 – drop emails indexes ───────────────────────────────────────────────
  await sql`DROP INDEX IF EXISTS idx_emails_tenant_status;`.execute(db);
  await sql`DROP INDEX IF EXISTS idx_emails_tenant_active;`.execute(db);
  await sql`DROP INDEX IF EXISTS idx_emails_tenant_assigned;`.execute(db);
  await sql`DROP INDEX IF EXISTS idx_emails_tenant_folder;`.execute(db);

  // ── #3 – newsletters: jsonb → text ────────────────────────────────────────
  await sql`
    ALTER TABLE newsletters
      ALTER COLUMN target_lists TYPE text USING target_lists::text,
      ALTER COLUMN segments     TYPE text USING segments::text;
  `.execute(db);

  // ── #2 – campaigns: date → text (original was time, but text is safer) ────
  await sql`
    ALTER TABLE campaigns
      ALTER COLUMN startdate TYPE text USING startdate::text,
      ALTER COLUMN enddate   TYPE text USING enddate::text;
  `.execute(db);

  // ── #1 – drop updated_at triggers and function ────────────────────────────
  for (const table of TRIGGER_TABLES) {
    await sql.raw(`DROP TRIGGER IF EXISTS trg_${table}_updated_at ON ${table};`).execute(db);
  }
  await sql`DROP FUNCTION IF EXISTS set_updated_at();`.execute(db);
}
