import type { Kysely } from 'kysely';
import type { Models } from '../../../../../../../libs/common/src/lib/kysely.models';
import { logger } from '../../../logger';
import { TransactionalEmailService } from '../../mail/transactional-mail.service';
import { DAY_MS, scheduleNextRun } from '../reschedule';

const mailService = new TransactionalEmailService();

const COMPLETED_JOB_RETENTION_DAYS = 7;

export async function handlePerformScheduledDeletions(db: Kysely<Models>): Promise<void> {
  const now = new Date();

  const expiredUsers = await db
    .selectFrom('authusers')
    .select('id')
    .where('deletion_scheduled_at', '<=', now)
    .execute();

  for (const user of expiredUsers) {
    const userId = String(user.id);
    await db.transaction().execute(async (trx) => {
      await trx.deleteFrom('sessions').where('user_id', '=', userId).execute();
      await trx.deleteFrom('profiles').where('auth_id', '=', userId).execute();
      await trx.deleteFrom('authusers').where('id', '=', userId).execute();
    });
  }

  const expiredTenants = await db
    .selectFrom('tenants')
    .select('id')
    .where('deletion_scheduled_at', '<=', now)
    .execute();

  for (const tenant of expiredTenants) {
    const tenantId = String(tenant.id);

    // Capture owner emails before deletion — background_jobs is wiped inside the transaction
    const ownerUsers = await db
      .selectFrom('authusers')
      .select(['email', 'first_name'])
      .where('tenant_id', '=', tenantId)
      .where('role', '=', 'owner')
      .execute();

    logger.info(`Hard-deleting tenant ${tenantId} (deletion_scheduled_at <= now)…`);
    await db.transaction().execute(async (trx) => {
      const tid = tenantId;

      // ── Collaboration ─────────────────────────────────────────────────
      await trx.deleteFrom('task_attachments').where('tenant_id', '=', tid).execute();
      await trx.deleteFrom('task_comments').where('tenant_id', '=', tid).execute();
      await trx.deleteFrom('task_subtasks').where('tenant_id', '=', tid).execute();
      await trx.deleteFrom('tasks').where('tenant_id', '=', tid).execute();
      await trx.deleteFrom('map_teams_lists').where('tenant_id', '=', tid).execute();
      await trx.deleteFrom('map_teams_persons').where('tenant_id', '=', tid).execute();
      await trx.deleteFrom('teams').where('tenant_id', '=', tid).execute();
      await trx.deleteFrom('map_lists_persons').where('tenant_id', '=', tid).execute();
      await trx.deleteFrom('map_lists_households').where('tenant_id', '=', tid).execute();
      await trx.deleteFrom('lists').where('tenant_id', '=', tid).execute();

      // ── Email & Marketing ──────────────────────────────────────────────
      await trx.deleteFrom('workflow_enrollments').where('tenant_id', '=', tid).execute();
      await trx.deleteFrom('workflow_steps').where('tenant_id', '=', tid).execute();
      await trx.deleteFrom('workflows').where('tenant_id', '=', tid).execute();
      await trx.deleteFrom('newsletter_events').where('tenant_id', '=', tid).execute();
      await trx.deleteFrom('newsletters').where('tenant_id', '=', tid).execute();

      // ── Ops & Platform ─────────────────────────────────────────────────
      await trx.deleteFrom('notifications').where('tenant_id', '=', tid).execute();
      await trx.deleteFrom('user_activity').where('tenant_id', '=', tid).execute();
      await trx.deleteFrom('potential_duplicates').where('tenant_id', '=', tid).execute();
      await trx.deleteFrom('data_imports').where('tenant_id', '=', tid).execute();
      await trx.deleteFrom('data_exports').where('tenant_id', '=', tid).execute();
      await trx.deleteFrom('web_forms').where('tenant_id', '=', tid).execute();
      await trx.deleteFrom('background_jobs').where('tenant_id', '=', tid).execute();
      await trx.deleteFrom('webhook_events').where('tenant_id', '=', tid).execute();
      await trx.deleteFrom('zapier_subscriptions').where('tenant_id', '=', tid).execute();
      await trx.deleteFrom('volunteer_shifts').where('tenant_id', '=', tid).execute();
      await trx.deleteFrom('volunteer_events').where('tenant_id', '=', tid).execute();
      await trx.deleteFrom('event_registrations').where('tenant_id', '=', tid).execute();
      await trx.deleteFrom('event_ticket_types').where('tenant_id', '=', tid).execute();
      await trx.deleteFrom('events').where('tenant_id', '=', tid).execute();
      await trx.deleteFrom('files').where('tenant_id', '=', tid).execute();
      await trx.deleteFrom('ms_oauth_tokens').where('tenant_id', '=', tid).execute();
      await trx.deleteFrom('google_oauth_tokens').where('tenant_id', '=', tid).execute();

      // ── Email inbox ────────────────────────────────────────────────────
      await trx.deleteFrom('email_read_states').where('tenant_id', '=', tid).execute();
      await trx.deleteFrom('email_comments').where('tenant_id', '=', tid).execute();
      await trx.deleteFrom('email_trash').where('tenant_id', '=', tid).execute();
      await trx.deleteFrom('email_drafts').where('tenant_id', '=', tid).execute();
      await trx.deleteFrom('emails').where('tenant_id', '=', tid).execute();

      // ── CRM Core ───────────────────────────────────────────────────────
      await trx.deleteFrom('map_campaigns_users').where('tenant_id', '=', tid).execute();
      await trx.deleteFrom('map_peoples_tags').where('tenant_id', '=', tid).execute();
      await trx.deleteFrom('map_households_tags').where('tenant_id', '=', tid).execute();
      await trx.deleteFrom('companies').where('tenant_id', '=', tid).execute();
      await trx.deleteFrom('persons').where('tenant_id', '=', tid).execute();
      await trx.deleteFrom('households').where('tenant_id', '=', tid).execute();
      await trx.deleteFrom('campaigns').where('tenant_id', '=', tid).execute();
      await trx.deleteFrom('tags').where('tenant_id', '=', tid).execute();
      await trx.deleteFrom('settings').where('tenant_id', '=', tid).execute();

      // ── Auth & Identity (last) ─────────────────────────────────────────
      // Null out FK references on tenants before deleting authusers
      await trx.updateTable('tenants').set({ admin_id: null }).where('id', '=', tid).execute();
      await trx.deleteFrom('sessions').where('tenant_id', '=', tid).execute();
      await trx.deleteFrom('profiles').where('tenant_id', '=', tid).execute();
      await trx.deleteFrom('authusers').where('tenant_id', '=', tid).execute();
      await trx.deleteFrom('tenants').where('id', '=', tid).execute();

      logger.info(`Tenant ${tenantId} fully hard-deleted.`);
    });

    // Send confirmation emails after the transaction commits (outside the wiped tenant scope)
    for (const owner of ownerUsers) {
      if (owner.email) {
        await mailService.sendMail({
          to: owner.email,
          subject: 'Your account data has been permanently deleted',
          text: `Hi ${owner.first_name},\n\nAll data associated with your pplCRM account has been permanently and securely deleted as requested. You will not be billed going forward.\n\nThank you for using pplCRM.`,
          html: `<h2>Account Data Deleted</h2>
<p>Hi ${owner.first_name},</p>
<p>All data associated with your pplCRM account has been permanently and securely deleted as requested. You will not be billed going forward.</p>
<p>Thank you for using pplCRM. If you ever wish to return, you are always welcome to create a new account.</p>`,
        });
      }
    }
  }

  // Permanently delete completed background jobs older than 7 days to prevent unbounded table growth
  const retentionCutoff = new Date(Date.now() - COMPLETED_JOB_RETENTION_DAYS * DAY_MS);
  await db
    .deleteFrom('background_jobs')
    .where('status', '=', 'completed')
    .where('updated_at', '<=', retentionCutoff)
    .execute();

  await scheduleNextRun(db, 'perform_scheduled_deletions', DAY_MS);
}
