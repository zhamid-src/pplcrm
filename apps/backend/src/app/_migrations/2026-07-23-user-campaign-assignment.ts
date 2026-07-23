import type { Kysely } from 'kysely';
import { sql } from 'kysely';

/**
 * Campaigns §15 — admin-assigned campaign membership. Editors and Viewers belong
 * to exactly one campaign; NULL means the permanent office context. Admins and
 * owners are never scoped by this column (they can work in every campaign), and
 * archiving a campaign clears its members back to NULL (office).
 */
export async function up(db: Kysely<any>): Promise<void> {
  await sql`
    ALTER TABLE public.authusers
      ADD COLUMN IF NOT EXISTS campaign_id bigint REFERENCES public.campaigns(id) ON DELETE SET NULL
  `.execute(db);
  await sql`
    CREATE INDEX IF NOT EXISTS authusers_tenant_campaign_index
      ON public.authusers (tenant_id, campaign_id)
  `.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  await sql`DROP INDEX IF EXISTS authusers_tenant_campaign_index`.execute(db);
  await sql`ALTER TABLE public.authusers DROP COLUMN IF EXISTS campaign_id`.execute(db);
}
