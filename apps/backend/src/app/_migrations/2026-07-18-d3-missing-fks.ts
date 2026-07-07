import type { Kysely } from 'kysely';
import { sql } from 'kysely';

/**
 * D-3: Add missing foreign keys on tenant-scoped and reference columns (schema
 * review 2026-07-06, §3). Without these, tenant deletion and record merges must
 * remember every orphan by hand; one missed table leaves dangling PII.
 *
 * Verified: 0 orphan rows for every FK added here (checked with LEFT JOIN before
 * writing). CASCADE is used for owned rows (the email domain, sessions/passkeys,
 * engagement rollups), matching the settings/files precedent; NO ACTION is used
 * for authusers and donation_periods per the review's deliberate choice ("users
 * outlive nothing silently" — the scheduled tenant-deletion job removes users
 * explicitly). Audit FKs (tags.createdby/updatedby) use NO ACTION like every
 * sibling table.
 *
 * DEFERRED to a separate step because they have existing orphans that must be
 * resolved first (see the orphan-cleanup migration): email_folders -> tenants
 * (4 orphans) and form_submissions -> web_forms/persons (42 orphans).
 * email_read_states / email_drafts / email_trash already have tenant FKs and are
 * left as-is.
 *
 * Each FK is drop-then-add for idempotency against a refreshed baseline.
 */
export async function up(db: Kysely<any>): Promise<void> {
  // --- Email domain -> tenants (CASCADE: owned rows) ---
  await sql`
    ALTER TABLE public.emails DROP CONSTRAINT IF EXISTS fk_emails_tenant;
    ALTER TABLE public.emails ADD CONSTRAINT fk_emails_tenant
      FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;

    ALTER TABLE public.email_bodies DROP CONSTRAINT IF EXISTS fk_email_bodies_tenant;
    ALTER TABLE public.email_bodies ADD CONSTRAINT fk_email_bodies_tenant
      FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;

    ALTER TABLE public.email_headers DROP CONSTRAINT IF EXISTS fk_email_headers_tenant;
    ALTER TABLE public.email_headers ADD CONSTRAINT fk_email_headers_tenant
      FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;

    ALTER TABLE public.email_recipients DROP CONSTRAINT IF EXISTS fk_email_recipients_tenant;
    ALTER TABLE public.email_recipients ADD CONSTRAINT fk_email_recipients_tenant
      FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;

    ALTER TABLE public.email_attachments DROP CONSTRAINT IF EXISTS fk_email_attachments_tenant;
    ALTER TABLE public.email_attachments ADD CONSTRAINT fk_email_attachments_tenant
      FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;

    ALTER TABLE public.email_comments DROP CONSTRAINT IF EXISTS fk_email_comments_tenant;
    ALTER TABLE public.email_comments ADD CONSTRAINT fk_email_comments_tenant
      FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
  `.execute(db);

  // --- Auth tables ---
  await sql`
    ALTER TABLE public.sessions DROP CONSTRAINT IF EXISTS fk_sessions_tenant;
    ALTER TABLE public.sessions ADD CONSTRAINT fk_sessions_tenant
      FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;

    ALTER TABLE public.passkeys DROP CONSTRAINT IF EXISTS fk_passkeys_tenant;
    ALTER TABLE public.passkeys ADD CONSTRAINT fk_passkeys_tenant
      FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;

    ALTER TABLE public.authusers DROP CONSTRAINT IF EXISTS fk_authusers_tenant;
    ALTER TABLE public.authusers ADD CONSTRAINT fk_authusers_tenant
      FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);

    ALTER TABLE public.donation_periods DROP CONSTRAINT IF EXISTS fk_donation_periods_tenant;
    ALTER TABLE public.donation_periods ADD CONSTRAINT fk_donation_periods_tenant
      FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);
  `.execute(db);

  // --- person_newsletter_engagements: no FKs at all before this ---
  await sql`
    ALTER TABLE public.person_newsletter_engagements DROP CONSTRAINT IF EXISTS fk_pne_newsletter;
    ALTER TABLE public.person_newsletter_engagements ADD CONSTRAINT fk_pne_newsletter
      FOREIGN KEY (newsletter_id) REFERENCES public.newsletters(id) ON DELETE CASCADE;

    ALTER TABLE public.person_newsletter_engagements DROP CONSTRAINT IF EXISTS fk_pne_tenant;
    ALTER TABLE public.person_newsletter_engagements ADD CONSTRAINT fk_pne_tenant
      FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
  `.execute(db);

  // --- tags audit FKs (NO ACTION, like every sibling table) ---
  await sql`
    ALTER TABLE public.tags DROP CONSTRAINT IF EXISTS fk_tags_createdby;
    ALTER TABLE public.tags ADD CONSTRAINT fk_tags_createdby
      FOREIGN KEY (createdby_id) REFERENCES public.authusers(id);

    ALTER TABLE public.tags DROP CONSTRAINT IF EXISTS fk_tags_updatedby;
    ALTER TABLE public.tags ADD CONSTRAINT fk_tags_updatedby
      FOREIGN KEY (updatedby_id) REFERENCES public.authusers(id);
  `.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  await sql`
    ALTER TABLE public.tags DROP CONSTRAINT IF EXISTS fk_tags_updatedby;
    ALTER TABLE public.tags DROP CONSTRAINT IF EXISTS fk_tags_createdby;
    ALTER TABLE public.person_newsletter_engagements DROP CONSTRAINT IF EXISTS fk_pne_tenant;
    ALTER TABLE public.person_newsletter_engagements DROP CONSTRAINT IF EXISTS fk_pne_newsletter;
    ALTER TABLE public.donation_periods DROP CONSTRAINT IF EXISTS fk_donation_periods_tenant;
    ALTER TABLE public.authusers DROP CONSTRAINT IF EXISTS fk_authusers_tenant;
    ALTER TABLE public.passkeys DROP CONSTRAINT IF EXISTS fk_passkeys_tenant;
    ALTER TABLE public.sessions DROP CONSTRAINT IF EXISTS fk_sessions_tenant;
    ALTER TABLE public.email_comments DROP CONSTRAINT IF EXISTS fk_email_comments_tenant;
    ALTER TABLE public.email_attachments DROP CONSTRAINT IF EXISTS fk_email_attachments_tenant;
    ALTER TABLE public.email_recipients DROP CONSTRAINT IF EXISTS fk_email_recipients_tenant;
    ALTER TABLE public.email_headers DROP CONSTRAINT IF EXISTS fk_email_headers_tenant;
    ALTER TABLE public.email_bodies DROP CONSTRAINT IF EXISTS fk_email_bodies_tenant;
    ALTER TABLE public.emails DROP CONSTRAINT IF EXISTS fk_emails_tenant;
  `.execute(db);
}
