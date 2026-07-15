import type { Kysely } from 'kysely';
import { sql } from 'kysely';

/**
 * Anti-abuse sending controls (free-tier spam prevention):
 *  - tenants.sending_paused_at/_reason — automated tripwire pause (hard-bounce rate) that blocks
 *    newsletter sending. Distinct from the user-initiated paused_at and the sign-in-blocking
 *    suspended_at (which the spam-complaint tripwire sets).
 *  - tenants phone-verification columns — free tenants must verify a mobile number by SMS before
 *    their first bulk send. Code hash + expiry + attempt counter live on the tenant row (never
 *    exposed through the settings snapshot).
 *  - newsletters.send_offset — resume point recorded when a send is paused mid-batch so an
 *    unpaused re-send continues where it stopped instead of double-sending early recipients.
 *  - newsletter_send_log — one row per delivered batch; SUM over a time window drives the
 *    free-tier warm-up cap (100 emails/day, first 7 days) and the per-tenant hourly send cap
 *    enforced by the outbox worker.
 */
export async function up(db: Kysely<any>): Promise<void> {
  await sql`
    ALTER TABLE public.tenants
      ADD COLUMN IF NOT EXISTS sending_paused_at timestamp with time zone,
      ADD COLUMN IF NOT EXISTS sending_paused_reason text,
      ADD COLUMN IF NOT EXISTS sending_phone text,
      ADD COLUMN IF NOT EXISTS sending_phone_verified_at timestamp with time zone,
      ADD COLUMN IF NOT EXISTS pending_phone text,
      ADD COLUMN IF NOT EXISTS phone_verification_code_hash text,
      ADD COLUMN IF NOT EXISTS phone_verification_expires_at timestamp with time zone,
      ADD COLUMN IF NOT EXISTS phone_verification_attempts integer DEFAULT 0 NOT NULL
  `.execute(db);

  await sql`ALTER TABLE public.newsletters ADD COLUMN IF NOT EXISTS send_offset integer`.execute(db);

  await sql`
    CREATE TABLE public.newsletter_send_log (
      id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      tenant_id bigint NOT NULL,
      newsletter_id bigint NOT NULL,
      recipient_count integer NOT NULL,
      created_at timestamp with time zone DEFAULT now() NOT NULL
    )
  `.execute(db);
  await sql`CREATE INDEX idx_newsletter_send_log_tenant_created ON public.newsletter_send_log (tenant_id, created_at)`.execute(
    db,
  );
  await sql`ALTER TABLE public.newsletter_send_log ENABLE ROW LEVEL SECURITY`.execute(db);
  await sql`ALTER TABLE public.newsletter_send_log FORCE ROW LEVEL SECURITY`.execute(db);
  await sql`
    CREATE POLICY tenant_isolation ON public.newsletter_send_log
      USING (((NULLIF(current_setting('app.tenant_id'::text, true), ''::text) IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::bigint)))
      WITH CHECK (((NULLIF(current_setting('app.tenant_id'::text, true), ''::text) IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::bigint)))
  `.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  await sql`DROP TABLE IF EXISTS public.newsletter_send_log`.execute(db);
  await sql`ALTER TABLE public.newsletters DROP COLUMN IF EXISTS send_offset`.execute(db);
  await sql`
    ALTER TABLE public.tenants
      DROP COLUMN IF EXISTS sending_paused_at,
      DROP COLUMN IF EXISTS sending_paused_reason,
      DROP COLUMN IF EXISTS sending_phone,
      DROP COLUMN IF EXISTS sending_phone_verified_at,
      DROP COLUMN IF EXISTS pending_phone,
      DROP COLUMN IF EXISTS phone_verification_code_hash,
      DROP COLUMN IF EXISTS phone_verification_expires_at,
      DROP COLUMN IF EXISTS phone_verification_attempts
  `.execute(db);
}
