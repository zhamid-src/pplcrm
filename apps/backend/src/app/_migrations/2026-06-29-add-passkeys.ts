import type { Kysely } from 'kysely';
import { sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  await sql`
    CREATE TABLE IF NOT EXISTS public.passkeys (
      id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      user_id bigint NOT NULL REFERENCES authusers(id) ON DELETE CASCADE,
      tenant_id bigint NOT NULL,
      credential_id text NOT NULL UNIQUE,
      public_key text NOT NULL,
      counter bigint NOT NULL DEFAULT 0,
      device_type text NOT NULL,
      backed_up boolean NOT NULL DEFAULT false,
      transports text[],
      aaguid text,
      friendly_name text,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `.execute(db);

  await sql`CREATE INDEX IF NOT EXISTS passkeys_user_id_idx ON passkeys(user_id)`.execute(db);
  await sql`CREATE INDEX IF NOT EXISTS passkeys_credential_id_idx ON passkeys(credential_id)`.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  await sql`DROP TABLE IF EXISTS public.passkeys`.execute(db);
}
