import type { Kysely } from 'kysely';
import { sql } from 'kysely';

/**
 * Task SLA-breach automation trigger (spec §4 → §16).
 *
 * - `tasks.person_id`: optional link to the contact a task is about. Automations enroll
 *   persons, so the `task_sla_breach` trigger needs it — the `create_task` automation step
 *   stamps the enrolled person, and the API accepts it on add/update. Nullable: most tasks
 *   are internal and have no linked contact (those skip enrollment when they breach).
 * - `tasks.sla_breached_at`: once-only marker stamped by the hourly scan the first time a
 *   task crosses its working-hours SLA target. Guarantees the trigger fires exactly once
 *   per task across cron ticks.
 */
export async function up(db: Kysely<any>): Promise<void> {
  await sql`ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS person_id bigint`.execute(db);
  await sql`
    DO $$
    BEGIN
      ALTER TABLE ONLY public.tasks
        ADD CONSTRAINT fk_tasks_person_id FOREIGN KEY (person_id) REFERENCES public.persons(id) ON DELETE SET NULL;
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END
    $$
  `.execute(db);
  await sql`CREATE INDEX IF NOT EXISTS idx_tasks_person_id ON public.tasks USING btree (person_id)`.execute(db);
  await sql`ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS sla_breached_at timestamp with time zone`.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  await sql`DROP INDEX IF EXISTS idx_tasks_person_id`.execute(db);
  await sql`ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS fk_tasks_person_id`.execute(db);
  await sql`ALTER TABLE public.tasks DROP COLUMN IF EXISTS person_id`.execute(db);
  await sql`ALTER TABLE public.tasks DROP COLUMN IF EXISTS sla_breached_at`.execute(db);
}
