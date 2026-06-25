import type { Kysely } from 'kysely';
import { sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  await sql`
    CREATE TABLE IF NOT EXISTS public.zapier_subscriptions (
      id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      tenant_id bigint NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      event_type text NOT NULL,
      webhook_url text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE (tenant_id, event_type)
    )
  `.execute(db);

  await sql`CREATE INDEX IF NOT EXISTS zapier_subscriptions_tenant_id_idx ON public.zapier_subscriptions(tenant_id)`.execute(
    db,
  );
}

export async function down(db: Kysely<any>): Promise<void> {
  await sql`DROP TABLE IF EXISTS public.zapier_subscriptions`.execute(db);
}
