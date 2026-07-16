import type { Kysely } from 'kysely';
import { sql } from 'kysely';

/**
 * Stripe Connect migration (WS2, 2026-07-16): donations no longer use tenant-held Stripe secrets —
 * charges run on the platform key against the tenant's connected account
 * (`donations.stripe_account_id`), and the per-tenant Stripe webhook secret is replaced by the
 * platform Connect endpoint (STRIPE_CONNECT_WEBHOOK_SECRET). Purge the now-dead (and previously
 * plaintext-stored) secrets. Pre-ship: only dev/test keys exist. `donations.webhook_token` stays —
 * the Helcim webhook still routes by it.
 */
export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    DELETE FROM public.settings
    WHERE key IN ('donations.stripe_secret_key', 'donations.stripe_webhook_secret')
  `.execute(db);
}

export async function down(_db: Kysely<unknown>): Promise<void> {
  // Deleted secrets are not recoverable; nothing to restore.
}
