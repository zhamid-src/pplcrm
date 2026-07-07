import type { Kysely } from 'kysely';
import { sql } from 'kysely';

// Spec §9.3 Duplicates: "'Not duplicates' remembered so the pair isn't re-flagged." The nightly
// sweep (`DuplicateMaintenanceService.recomputeAllDuplicates`) fully deletes and reinserts
// `potential_duplicates` every run, so persisting a dismissal has to live outside that table.
// One row per dismissed `group_key` per tenant; `recomputeAllDuplicates` anti-joins against this
// table so a dismissed pair is never reinserted into the queue.
export async function up(db: Kysely<any>): Promise<void> {
  await sql`
    CREATE TABLE public.dismissed_duplicate_groups (
      tenant_id bigint NOT NULL,
      group_key text NOT NULL,
      dismissed_by_id bigint NOT NULL,
      dismissed_at timestamp with time zone DEFAULT now() NOT NULL,
      PRIMARY KEY (tenant_id, group_key)
    )
  `.execute(db);

  await sql`ALTER TABLE public.dismissed_duplicate_groups OWNER TO pplcrm_owner`.execute(db);

  await sql`
    ALTER TABLE public.dismissed_duplicate_groups
      ADD CONSTRAINT fk_dismissed_duplicate_groups_tenant_id
      FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE
  `.execute(db);

  await sql`CREATE INDEX idx_dismissed_duplicate_groups_tenant ON public.dismissed_duplicate_groups USING btree (tenant_id)`.execute(
    db,
  );

  // Same tenant-isolation policy shape as every other tenant_id table (S-1).
  await sql`ALTER TABLE public.dismissed_duplicate_groups ENABLE ROW LEVEL SECURITY`.execute(db);
  await sql`ALTER TABLE ONLY public.dismissed_duplicate_groups FORCE ROW LEVEL SECURITY`.execute(db);
  await sql`
    CREATE POLICY tenant_isolation ON public.dismissed_duplicate_groups
    USING (
      (NULLIF(current_setting('app.tenant_id', true), '') IS NULL)
      OR (tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::bigint)
    )
    WITH CHECK (
      (NULLIF(current_setting('app.tenant_id', true), '') IS NULL)
      OR (tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::bigint)
    )
  `.execute(db);
  await sql`GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.dismissed_duplicate_groups TO pplcrm_app`.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  await sql`DROP TABLE IF EXISTS public.dismissed_duplicate_groups`.execute(db);
}
