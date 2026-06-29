/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Kysely } from 'kysely';
import { sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  await sql`
    CREATE TABLE public.person_newsletter_engagements (
      tenant_id       bigint      NOT NULL,
      newsletter_id   bigint      NOT NULL,
      email           text        NOT NULL,
      open_count      integer     NOT NULL DEFAULT 0,
      click_count     integer     NOT NULL DEFAULT 0,
      has_unsubscribed boolean    NOT NULL DEFAULT false,
      hard_bounced    boolean     NOT NULL DEFAULT false,
      soft_bounced    boolean     NOT NULL DEFAULT false,
      first_opened_at  timestamptz,
      last_opened_at   timestamptz,
      first_clicked_at timestamptz,
      last_clicked_at  timestamptz,
      bounced_at       timestamptz,
      unsubscribed_at  timestamptz,
      PRIMARY KEY (tenant_id, newsletter_id, email)
    )
  `.execute(db);

  await sql`
    CREATE INDEX idx_pne_tenant_email ON public.person_newsletter_engagements (tenant_id, email)
  `.execute(db);

  await sql`
    CREATE INDEX idx_pne_newsletter ON public.person_newsletter_engagements (newsletter_id)
  `.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  await sql`DROP TABLE IF EXISTS public.person_newsletter_engagements`.execute(db);
}
