import type { Kysely } from 'kysely';
import { sql } from 'kysely';

// Campaigns §15 — turn the vestigial single-hidden-campaign into real "contexts".
// A tenant permanently runs one 'office' context (constituency office) and any number of
// time-bounded 'election' campaigns; several can be active at once and users switch between
// them. People/households remain one shared tenant-wide rolodex, so their `campaign_id`
// drops to nullable provenance ("first captured in") — campaign-specific facts about a
// person (support level, voting status, subscriptions) live in their own tables added by
// later migrations, never on the person row.
export async function up(db: Kysely<any>): Promise<void> {
  await sql`
    ALTER TABLE public.campaigns
      ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'office',
      ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active'
  `.execute(db);

  await sql`
    ALTER TABLE public.campaigns
      ADD CONSTRAINT chk_campaigns_kind CHECK (kind = ANY (ARRAY['office'::text, 'election'::text]))
  `.execute(db);
  await sql`
    ALTER TABLE public.campaigns
      ADD CONSTRAINT chk_campaigns_status CHECK (status = ANY (ARRAY['active'::text, 'archived'::text]))
  `.execute(db);

  // Every pre-existing row is the signup-created default campaign — that IS the office context.
  await sql`UPDATE public.campaigns SET kind = 'office', status = 'active'`.execute(db);

  await sql`ALTER TABLE public.persons ALTER COLUMN campaign_id DROP NOT NULL`.execute(db);
  await sql`ALTER TABLE public.households ALTER COLUMN campaign_id DROP NOT NULL`.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  await sql`ALTER TABLE public.persons ALTER COLUMN campaign_id SET NOT NULL`.execute(db);
  await sql`ALTER TABLE public.households ALTER COLUMN campaign_id SET NOT NULL`.execute(db);
  await sql`ALTER TABLE public.campaigns DROP CONSTRAINT IF EXISTS chk_campaigns_kind`.execute(db);
  await sql`ALTER TABLE public.campaigns DROP CONSTRAINT IF EXISTS chk_campaigns_status`.execute(db);
  await sql`
    ALTER TABLE public.campaigns
      DROP COLUMN IF EXISTS kind,
      DROP COLUMN IF EXISTS status
  `.execute(db);
}
