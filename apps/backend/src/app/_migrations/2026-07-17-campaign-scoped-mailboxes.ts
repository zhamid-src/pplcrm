import type { Kysely } from 'kysely';
import { sql } from 'kysely';

/**
 * Campaigns §15 — email provider connections and the Inbox become
 * campaign-scoped. Each campaign (office or election) connects its own
 * Office 365 / Gmail mailbox, and the mail synced from it lands in that
 * campaign's Inbox. Switching context switches both the connection UI and the
 * visible mail.
 *
 * Token tables (`ms_oauth_tokens`, `google_oauth_tokens`): the old
 * `UNIQUE (tenant_id)` "one account per tenant" constraint becomes
 * `UNIQUE (tenant_id, campaign_id)` — one account per provider per campaign.
 * Because a legacy token has no meaningful campaign to belong to (and the
 * OAuth flow now binds a connection to the campaign it was authorized under),
 * we DROP existing token rows: tenants reconnect their mailbox under a
 * campaign. Nothing is shipped yet, so this is safe.
 *
 * Inbox tables (`emails`, `email_drafts`): gain `campaign_id NOT NULL`
 * (FK → campaigns). Existing rows are backfilled to each tenant's office
 * context so no mail is destroyed. Children (email_bodies, email_recipients,
 * email_headers, email_attachments, email_read_states, email_comments,
 * email_trash) inherit context via their parent `emails.id` — no column.
 */

const TOKEN_TABLES = ['ms_oauth_tokens', 'google_oauth_tokens'] as const;
const INBOX_TABLES = ['emails', 'email_drafts'] as const;

export async function up(db: Kysely<unknown>): Promise<void> {
  // Legacy connections have no campaign — require reconnect under a context.
  for (const table of TOKEN_TABLES) {
    await sql
      .raw(
        `
      DELETE FROM public.${table};
      ALTER TABLE public.${table} DROP CONSTRAINT IF EXISTS ${table}_tenant_id_key;
      ALTER TABLE public.${table} ADD COLUMN campaign_id bigint NOT NULL;
      ALTER TABLE ONLY public.${table} ADD CONSTRAINT fk_${table}_campaign FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id);
      ALTER TABLE ONLY public.${table} ADD CONSTRAINT ${table}_tenant_campaign_key UNIQUE (tenant_id, campaign_id);
    `,
      )
      .execute(db);
  }

  // Inbox rows are backfilled to the office context — non-destructive.
  for (const table of INBOX_TABLES) {
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
  for (const table of [...INBOX_TABLES].reverse()) {
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

  for (const table of [...TOKEN_TABLES].reverse()) {
    await sql
      .raw(
        `
      ALTER TABLE public.${table} DROP CONSTRAINT IF EXISTS ${table}_tenant_campaign_key;
      ALTER TABLE public.${table} DROP CONSTRAINT IF EXISTS fk_${table}_campaign;
      ALTER TABLE public.${table} DROP COLUMN IF EXISTS campaign_id;
      ALTER TABLE ONLY public.${table} ADD CONSTRAINT ${table}_tenant_id_key UNIQUE (tenant_id);
    `,
      )
      .execute(db);
  }
}
