import type { Kysely } from 'kysely';
import { sql } from 'kysely';

/**
 * Workspace API keys for public form/event submissions.
 *
 * - `workspace_api_keys.tenant_id`: which workspace owns this key
 * - `workspace_api_keys.key_hash`: bcrypt hash of the generated key (indexed for lookup)
 * - `workspace_api_keys.key_preview`: first 8 chars of the key for UI display
 * - `workspace_api_keys.created_at`: when the key was generated
 * - `workspace_api_keys.last_used_at`: audit trail (updated on successful submission)
 *
 * Constraint: one active key per tenant (if a new one is generated, the old one is deleted).
 * Key format: "ws_<tenant_slug>_<random32>" — 50 chars total.
 */
export async function up(db: Kysely<any>): Promise<void> {
  await sql`
    CREATE TABLE IF NOT EXISTS public.workspace_api_keys (
      id bigserial NOT NULL PRIMARY KEY,
      tenant_id bigint NOT NULL,
      key_hash text NOT NULL,
      key_preview text NOT NULL,
      created_at timestamp with time zone NOT NULL DEFAULT now(),
      last_used_at timestamp with time zone,
      CONSTRAINT fk_workspace_api_keys_tenant_id FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE,
      CONSTRAINT uq_workspace_api_keys_tenant_id UNIQUE (tenant_id)
    )
  `.execute(db);

  await sql`CREATE INDEX IF NOT EXISTS idx_workspace_api_keys_key_hash ON public.workspace_api_keys USING btree (key_hash)`.execute(
    db,
  );
}

export async function down(db: Kysely<any>): Promise<void> {
  await sql`DROP TABLE IF EXISTS public.workspace_api_keys`.execute(db);
}
