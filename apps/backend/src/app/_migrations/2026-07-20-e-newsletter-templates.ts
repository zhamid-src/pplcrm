import type { Kysely } from 'kysely';
import { sql } from 'kysely';

/**
 * User-saved newsletter templates: a tenant-wide library of reusable designs
 * saved from the newsletter wizard.
 *
 * No campaign_id on purpose — a template is pure content (the compiled HTML with
 * the embedded PPLCRM_VISUAL_BLOCKS_DATA block model plus its plain-text twin).
 * It carries no audience, consent, or send logic, so per the Campaigns §15
 * shared-rolodex-vs-scoped-facts rule it lives on the shared side and stays
 * usable across every campaign context and after carry-over.
 *
 * (Filename note: dated 2026-07-20-e, not the authoring date, because dated
 * migrations through 2026-07-20-d are already applied and Kysely's migrator
 * rejects a new file that sorts before an executed one.)
 */
export async function up(db: Kysely<any>): Promise<void> {
  await sql`
    CREATE TABLE public.newsletter_templates (
      id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      tenant_id bigint NOT NULL,
      createdby_id bigint NOT NULL,
      updatedby_id bigint NOT NULL,
      name text NOT NULL,
      html_content text NOT NULL,
      plain_text_content text DEFAULT ''::text NOT NULL,
      created_at timestamp with time zone DEFAULT now() NOT NULL,
      updated_at timestamp with time zone DEFAULT now() NOT NULL,
      CONSTRAINT fk_newsletter_templates_tenant FOREIGN KEY (tenant_id) REFERENCES public.tenants(id)
    )
  `.execute(db);
  await sql`CREATE INDEX idx_newsletter_templates_tenant_name ON public.newsletter_templates (tenant_id, name)`.execute(
    db,
  );
  await sql`
    CREATE TRIGGER trg_newsletter_templates_updated_at
      BEFORE UPDATE ON public.newsletter_templates
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()
  `.execute(db);
  await sql`ALTER TABLE public.newsletter_templates ENABLE ROW LEVEL SECURITY`.execute(db);
  await sql`ALTER TABLE public.newsletter_templates FORCE ROW LEVEL SECURITY`.execute(db);
  await sql`
    CREATE POLICY tenant_isolation ON public.newsletter_templates
      USING (((NULLIF(current_setting('app.tenant_id'::text, true), ''::text) IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::bigint)))
      WITH CHECK (((NULLIF(current_setting('app.tenant_id'::text, true), ''::text) IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::bigint)))
  `.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  await sql`DROP TABLE IF EXISTS public.newsletter_templates`.execute(db);
}
