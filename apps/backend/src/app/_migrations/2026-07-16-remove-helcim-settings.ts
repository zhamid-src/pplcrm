import type { Kysely } from 'kysely';
import { sql } from 'kysely';

/**
 * Helcim removal (2026-07-16): donations are Stripe Connect only — the Helcim processor, its
 * tokened webhook route, and the processor switch are gone. Purge the now-dead settings rows:
 * the processor selection, the tenant-held Helcim credentials, and `donations.webhook_token`
 * (which the earlier drop-tenant-stripe-secrets migration kept only because the Helcim webhook
 * still routed by it). Pre-ship: only dev/test values exist.
 */
export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    DELETE FROM public.settings
    WHERE key IN (
      'donations.processor',
      'donations.helcim_api_token',
      'donations.helcim_webhook_secret',
      'donations.webhook_token'
    )
  `.execute(db);
}

export async function down(_db: Kysely<unknown>): Promise<void> {
  // Deleted credentials are not recoverable; nothing to restore.
}
