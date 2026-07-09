import type { Kysely } from 'kysely';
import { sql } from 'kysely';

/**
 * Campaigns §15 — the operational domains become campaign-scoped: everything a
 * team DOES lives in exactly one context (office or an election campaign),
 * while people/households/companies/tags stay one shared tenant-wide rolodex.
 *
 * Adds `campaign_id bigint NOT NULL` (FK → campaigns, backfilled to each
 * tenant's office context) to:
 *   donations, donation_pledges, donation_periods  — election-finance separation:
 *     office funds and campaign funds never mix; contribution-limit windows are
 *     per campaign
 *   web_forms       — a sign-up form collects consent for ONE campaign
 *   lists           — segments built for a campaign don't pollute the office
 *   events          — event pages belong to a context
 *   turfs           — canvassing is inherently a campaign activity
 *   delivery_requests, delivery_routes — yard-sign ops per campaign
 *
 * Children (form_submissions, event_registrations, turf_* tables,
 * delivery_route_stops) inherit context via their parent — no column.
 * `newsletters.campaign_id` was added by the subscriptions migration.
 */

const SCOPED_TABLES = [
  'donations',
  'donation_pledges',
  'donation_periods',
  'web_forms',
  'lists',
  'events',
  'turfs',
  'delivery_requests',
  'delivery_routes',
] as const;

export async function up(db: Kysely<unknown>): Promise<void> {
  // With donations campaign-scoped, "donor" becomes a DERIVED badge (from the
  // donations table, per campaign and lifetime) — the always-stale tag retires.
  await sql
    .raw(
      `
    DELETE FROM public.map_peoples_tags mpt
    USING public.tags t
    WHERE t.id = mpt.tag_id AND t.tenant_id = mpt.tenant_id AND lower(t.name) = 'donor';
    DELETE FROM public.map_households_tags mht
    USING public.tags t
    WHERE t.id = mht.tag_id AND t.tenant_id = mht.tenant_id AND lower(t.name) = 'donor';
    DELETE FROM public.tags WHERE lower(name) = 'donor';
  `,
    )
    .execute(db);

  for (const table of SCOPED_TABLES) {
    await sql
      .raw(
        `
      ALTER TABLE public.${table} ADD COLUMN campaign_id bigint;
      UPDATE public.${table} t SET campaign_id = c.id
        FROM public.campaigns c WHERE c.tenant_id = t.tenant_id AND c.kind = 'office';
      ALTER TABLE public.${table} ALTER COLUMN campaign_id SET NOT NULL;
      ALTER TABLE ONLY public.${table} ADD CONSTRAINT fk_${table}_campaign FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id);
      CREATE INDEX idx_${table}_tenant_campaign ON public.${table} (tenant_id, campaign_id);
    `,
      )
      .execute(db);
  }
}

export async function down(db: Kysely<unknown>): Promise<void> {
  for (const table of [...SCOPED_TABLES].reverse()) {
    await sql
      .raw(
        `
      DROP INDEX IF EXISTS idx_${table}_tenant_campaign;
      ALTER TABLE public.${table} DROP CONSTRAINT IF EXISTS fk_${table}_campaign;
      ALTER TABLE public.${table} DROP COLUMN IF EXISTS campaign_id;
    `,
      )
      .execute(db);
  }
}
