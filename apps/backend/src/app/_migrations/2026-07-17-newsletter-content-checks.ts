import type { Kysely } from 'kysely';
import { sql } from 'kysely';

/**
 * Newsletter preflight ("deliverability check") result cache + audit log.
 *
 * One row per (tenant, content-hash): the composer's on-demand check upserts here, and the
 * send-time gate (`assertNewsletterContentSendable`) reuses the row when the newsletter's stored
 * content hashes to the same value — so a checked newsletter sends with no recompute and no extra
 * AI spend. `newsletter_id` is nullable because the composer checks content before the newsletter
 * row exists; the send-time hit backfills it. No FK on newsletter_id (same convention as
 * newsletter_send_log).
 */
export async function up(db: Kysely<any>): Promise<void> {
  await sql`
    CREATE TABLE public.newsletter_content_checks (
      id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      tenant_id bigint NOT NULL,
      newsletter_id bigint,
      content_hash text NOT NULL,
      score integer NOT NULL,
      band text NOT NULL,
      findings jsonb DEFAULT '[]'::jsonb NOT NULL,
      ai_verdict jsonb,
      ai_model text,
      created_at timestamp with time zone DEFAULT now() NOT NULL,
      CONSTRAINT uq_newsletter_content_checks_hash UNIQUE (tenant_id, content_hash),
      CONSTRAINT chk_ncc_band CHECK ((band = ANY (ARRAY['good'::text, 'fix'::text, 'blocked'::text])))
    )
  `.execute(db);
  await sql`CREATE INDEX idx_newsletter_content_checks_newsletter ON public.newsletter_content_checks (tenant_id, newsletter_id)`.execute(
    db,
  );
  await sql`ALTER TABLE public.newsletter_content_checks ENABLE ROW LEVEL SECURITY`.execute(db);
  await sql`ALTER TABLE public.newsletter_content_checks FORCE ROW LEVEL SECURITY`.execute(db);
  await sql`
    CREATE POLICY tenant_isolation ON public.newsletter_content_checks
      USING (((NULLIF(current_setting('app.tenant_id'::text, true), ''::text) IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::bigint)))
      WITH CHECK (((NULLIF(current_setting('app.tenant_id'::text, true), ''::text) IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::bigint)))
  `.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  await sql`DROP TABLE IF EXISTS public.newsletter_content_checks`.execute(db);
}
