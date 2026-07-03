import type { ExpressionBuilder, Kysely } from 'kysely';
import { sql } from 'kysely';
import type { Models } from '../../../../../../../libs/common/src/lib/kysely.models';
import { logger } from '../../../logger';
import { NewsletterEmailService } from '../../mail/newsletter-mail.service';
import { UserActivityRepo } from '../../user-activity.repo';
import type { JobPayloadOf } from '../job-payloads';
import { DAY_MS, scheduleNextRun } from '../reschedule';

const NEWSLETTER_BATCH_SIZE = 500;
const BATCH_DELAY_MS = 1000;

export async function handleSendNewsletter(
  payload: JobPayloadOf<'send-newsletter'>,
  db: Kysely<Models>,
  jobId?: string,
): Promise<void> {
  const newsletterMailSvc = new NewsletterEmailService();
  const { tenantId, newsletterId, userId } = payload;

  // 1. Fetch newsletter to get settings, targets, segments, and content
  const newsletter = await db
    .selectFrom('newsletters')
    .selectAll()
    .where('tenant_id', '=', tenantId)
    .where('id', '=', newsletterId)
    .executeTakeFirst();

  if (!newsletter) {
    logger.warn(`Newsletter ${newsletterId} not found.`);
    return;
  }

  // 2. Build the recipient query using NewslettersController
  const { NewslettersController } = await import('../../../modules/newsletters/controller');
  const controller = new NewslettersController();
  const baseQuery = controller.buildRecipientQuery(tenantId, newsletter);

  // 3. Count total recipients
  let offset = payload.offset ?? 0;
  let deliveredCount = payload.deliveredCount ?? 0;

  const countResult = await baseQuery
    .select(({ fn }: ExpressionBuilder<Models, 'persons'>) => fn.count(sql`DISTINCT persons.email`).as('count'))
    .executeTakeFirst();
  const totalRecipients = Number(countResult?.count || 0);

  if (offset === 0) {
    await db
      .updateTable('newsletters')
      .set({
        status: 'sending',
        total_recipients: totalRecipients,
        updated_at: new Date(),
      })
      .where('tenant_id', '=', tenantId)
      .where('id', '=', newsletterId)
      .execute();
  }

  // Load communications/settings from database
  const settingsRows = await db
    .selectFrom('settings')
    .select(['key', 'value'])
    .where('tenant_id', '=', tenantId)
    .where('key', 'in', [
      'communications.sendgrid_api_key',
      'communications.sendgrid_subuser_username',
      'communications.default_from_name',
      'communications.default_from_email',
      'communications.reply_to',
      'communications.footer_disclaimer',
      'communications.verified_emails',
      'organization.address',
    ])
    .execute();

  const settingsMap: Record<string, string> = {};
  let verifiedEmails: string[] = [];
  for (const row of settingsRows) {
    if (typeof row.value === 'string') {
      settingsMap[row.key] = row.value;
    } else if (row.key === 'communications.verified_emails' && Array.isArray(row.value)) {
      verifiedEmails = (row.value as unknown[]).map((e) => String(e).toLowerCase().trim());
    }
  }

  const sendgridApiKey = settingsMap['communications.sendgrid_api_key'];
  const subuserUsername = settingsMap['communications.sendgrid_subuser_username'];
  const fromName = settingsMap['communications.default_from_name'] || 'PeopleCRM Team';
  const fromEmail = settingsMap['communications.default_from_email'] || 'pplcrm@campaignraven.com';

  // Reply-to is only honored when it has been verified (mirrors settings save-time validation).
  const replyToRaw = (settingsMap['communications.reply_to'] || '').toLowerCase().trim();
  const replyTo = replyToRaw && verifiedEmails.includes(replyToRaw) ? replyToRaw : undefined;

  // Mandatory footer appended server-side so it cannot be removed from the editor: org address,
  // tenant disclaimer, and a SendGrid-substituted unsubscribe link.
  const footer = buildNewsletterFooter(
    settingsMap['organization.address'],
    settingsMap['communications.footer_disclaimer'],
  );

  while (offset < totalRecipients) {
    // Query a chunk of recipients dynamically using LIMIT and OFFSET
    // We order by persons.email asc to ensure consistent pagination ordering
    const chunkRows = await baseQuery
      .select(['persons.email'])
      .distinct()
      .orderBy('persons.email', 'asc')
      .limit(NEWSLETTER_BATCH_SIZE)
      .offset(offset)
      .execute();

    const chunk: string[] = Array.from(
      new Set(chunkRows.map((r: { email: string | null }) => r.email?.trim()).filter(Boolean)),
    );

    if (chunk.length === 0) {
      break;
    }

    const batchDelivered = await newsletterMailSvc.sendNewsletter({
      fromName,
      fromEmail,
      replyTo,
      recipients: chunk,
      subject: newsletter.subject || 'Newsletter',
      html: (newsletter.html_content || '') + footer.html,
      text: newsletter.plain_text_content ? newsletter.plain_text_content + footer.text : undefined,
      sendgridApiKey,
      subuserUsername,
      newsletterId,
      tenantId,
    });

    deliveredCount += batchDelivered;
    offset += chunkRows.length;

    // Update progress in the background job payload (no recipients array!)
    if (jobId) {
      await db
        .updateTable('background_jobs')
        .set({
          payload: JSON.stringify({
            type: 'send-newsletter',
            newsletterId,
            tenantId,
            userId,
            offset,
            deliveredCount,
          }),
          updated_at: new Date(),
        })
        .where('id', '=', jobId)
        .execute();
    }

    // Add a small delay between batches to respect rate limits
    if (offset < totalRecipients) {
      await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY_MS));
    }
  }

  // Update newsletter status to 'sent'
  await db
    .updateTable('newsletters')
    .set({
      status: 'sent',
      delivered_count: deliveredCount,
      send_date: new Date(),
      updatedby_id: userId,
      updated_at: new Date(),
    })
    .where('tenant_id', '=', tenantId)
    .where('id', '=', newsletterId)
    .execute();

  // Log user activity
  const userActivity = new UserActivityRepo();
  await userActivity.log({
    tenant_id: tenantId,
    user_id: userId,
    activity: 'send',
    entity: 'newsletters',
    entity_id: newsletterId,
    quantity: totalRecipients,
    metadata: { recipientsCount: totalRecipients, deliveredCount },
  });

  const { queueUsageLimitCheck } = await import('../../../modules/billing/usage-limits');
  await queueUsageLimitCheck(tenantId, db);
}

export async function handlePruneNewsletterEvents(db: Kysely<Models>): Promise<void> {
  await pruneNewsletterEvents(db);
  await scheduleNextRun(db, 'prune_newsletter_events', DAY_MS);
}

// Event types that warrant keeping a per-newsletter engagement record.
// Delivery-only events (delivered, deferred, processed) are not stored.
const ENGAGEMENT_EVENT_TYPES = new Set(['open', 'click', 'unsubscribe', 'group_unsubscribe', 'bounce', 'spamreport']);

async function pruneNewsletterEvents(db: Kysely<Models>): Promise<void> {
  const tenants: { id: string; subscription_plan: string | null }[] = await db
    .selectFrom('tenants')
    .select(['id', 'subscription_plan'])
    .execute();

  for (const tenant of tenants) {
    try {
      const plan = tenant.subscription_plan ?? 'free';
      const retentionDays =
        plan.toLowerCase() === 'representative' ? 90 : plan.toLowerCase() === 'grassroots' ? 30 : 15;

      const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
      const tenantId = String(tenant.id);

      // Fetch events older than the retention window that are engagement events.
      const expiringEvents: {
        newsletter_id: string;
        email: string;
        event_type: string;
        timestamp: Date;
      }[] = await db
        .selectFrom('newsletter_events')
        .select(['newsletter_id', 'email', 'event_type', 'timestamp'])
        .where('tenant_id', '=', tenantId)
        .where('created_at', '<', cutoff)
        .execute();

      // Group by (newsletter_id, email) to produce one upsert per recipient.
      const grouped = new Map<
        string,
        {
          newsletter_id: string;
          email: string;
          open_count: number;
          click_count: number;
          has_unsubscribed: boolean;
          hard_bounced: boolean;
          soft_bounced: boolean;
          first_opened_at: Date | null;
          last_opened_at: Date | null;
          first_clicked_at: Date | null;
          last_clicked_at: Date | null;
          bounced_at: Date | null;
          unsubscribed_at: Date | null;
        }
      >();

      for (const ev of expiringEvents) {
        if (!ENGAGEMENT_EVENT_TYPES.has(ev.event_type)) continue;

        const key = `${ev.newsletter_id}::${ev.email}`;
        let agg = grouped.get(key);
        if (!agg) {
          agg = {
            newsletter_id: ev.newsletter_id,
            email: ev.email,
            open_count: 0,
            click_count: 0,
            has_unsubscribed: false,
            hard_bounced: false,
            soft_bounced: false,
            first_opened_at: null,
            last_opened_at: null,
            first_clicked_at: null,
            last_clicked_at: null,
            bounced_at: null,
            unsubscribed_at: null,
          };
          grouped.set(key, agg);
        }
        const ts = new Date(ev.timestamp);

        if (ev.event_type === 'open') {
          agg.open_count++;
          if (!agg.first_opened_at || ts < agg.first_opened_at) agg.first_opened_at = ts;
          if (!agg.last_opened_at || ts > agg.last_opened_at) agg.last_opened_at = ts;
        } else if (ev.event_type === 'click') {
          agg.click_count++;
          if (!agg.first_clicked_at || ts < agg.first_clicked_at) agg.first_clicked_at = ts;
          if (!agg.last_clicked_at || ts > agg.last_clicked_at) agg.last_clicked_at = ts;
        } else if (ev.event_type === 'unsubscribe' || ev.event_type === 'group_unsubscribe') {
          agg.has_unsubscribed = true;
          if (!agg.unsubscribed_at || ts < agg.unsubscribed_at) agg.unsubscribed_at = ts;
        } else if (ev.event_type === 'bounce') {
          // SendGrid bounce events don't carry a sub-type in this table;
          // treat all as hard bounce (the webhook handler can refine this).
          agg.hard_bounced = true;
          if (!agg.bounced_at) agg.bounced_at = ts;
        } else if (ev.event_type === 'spamreport') {
          agg.has_unsubscribed = true;
          if (!agg.unsubscribed_at || ts < agg.unsubscribed_at) agg.unsubscribed_at = ts;
        }
      }

      // Upsert aggregated rows, then delete the raw events.
      if (grouped.size > 0) {
        await db.transaction().execute(async (trx) => {
          for (const row of grouped.values()) {
            await trx
              .insertInto('person_newsletter_engagements')
              .values({
                tenant_id: tenantId,
                newsletter_id: row.newsletter_id,
                email: row.email,
                open_count: row.open_count,
                click_count: row.click_count,
                has_unsubscribed: row.has_unsubscribed,
                hard_bounced: row.hard_bounced,
                soft_bounced: row.soft_bounced,
                first_opened_at: row.first_opened_at,
                last_opened_at: row.last_opened_at,
                first_clicked_at: row.first_clicked_at,
                last_clicked_at: row.last_clicked_at,
                bounced_at: row.bounced_at,
                unsubscribed_at: row.unsubscribed_at,
              })
              .onConflict((oc) =>
                oc.columns(['tenant_id', 'newsletter_id', 'email']).doUpdateSet((eb) => ({
                  open_count: sql`person_newsletter_engagements.open_count + ${eb.ref('excluded.open_count')}`,
                  click_count: sql`person_newsletter_engagements.click_count + ${eb.ref('excluded.click_count')}`,
                  has_unsubscribed: sql`person_newsletter_engagements.has_unsubscribed OR excluded.has_unsubscribed`,
                  hard_bounced: sql`person_newsletter_engagements.hard_bounced OR excluded.hard_bounced`,
                  soft_bounced: sql`person_newsletter_engagements.soft_bounced OR excluded.soft_bounced`,
                  first_opened_at: sql`LEAST(person_newsletter_engagements.first_opened_at, excluded.first_opened_at)`,
                  last_opened_at: sql`GREATEST(person_newsletter_engagements.last_opened_at, excluded.last_opened_at)`,
                  first_clicked_at: sql`LEAST(person_newsletter_engagements.first_clicked_at, excluded.first_clicked_at)`,
                  last_clicked_at: sql`GREATEST(person_newsletter_engagements.last_clicked_at, excluded.last_clicked_at)`,
                  bounced_at: sql`COALESCE(person_newsletter_engagements.bounced_at, excluded.bounced_at)`,
                  unsubscribed_at: sql`COALESCE(person_newsletter_engagements.unsubscribed_at, excluded.unsubscribed_at)`,
                })),
              )
              .execute();
          }

          await trx
            .deleteFrom('newsletter_events')
            .where('tenant_id', '=', tenantId)
            .where('created_at', '<', cutoff)
            .execute();
        });
      } else {
        // No engagement events to aggregate — still prune non-engagement events.
        await db
          .deleteFrom('newsletter_events')
          .where('tenant_id', '=', tenantId)
          .where('created_at', '<', cutoff)
          .execute();
      }
    } catch (err) {
      logger.error({ err }, `[prune_newsletter_events] Failed for tenant ${tenant.id}`);
    }
  }
}

/**
 * Builds the mandatory newsletter footer appended server-side at send time (so it cannot be removed
 * from the editor). Contains the organization address, the tenant footer disclaimer, and a SendGrid
 * substitution tag (`<% unsubscribe %>`) that SendGrid replaces with a working unsubscribe link when
 * subscription tracking is enabled.
 */
function buildNewsletterFooter(address?: string, disclaimer?: string): { html: string; text: string } {
  const esc = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  const htmlParts: string[] = [];
  const textParts: string[] = [];

  const addr = (address || '').trim();
  if (addr) {
    htmlParts.push(`<div>${esc(addr).replace(/\n/g, '<br>')}</div>`);
    textParts.push(addr);
  }

  const disc = (disclaimer || '').trim();
  if (disc) {
    htmlParts.push(`<div>${esc(disc).replace(/\n/g, '<br>')}</div>`);
    textParts.push(disc);
  }

  // SendGrid substitution tag — replaced with the recipient's unsubscribe URL.
  htmlParts.push('<div><a href="<% unsubscribe %>">Unsubscribe</a></div>');
  textParts.push('Unsubscribe: <% unsubscribe %>');

  const html = `<hr style="margin-top:24px"><div style="font-size:12px;color:#888;margin-top:8px">${htmlParts.join('')}</div>`;
  const text = `\n\n----\n${textParts.join('\n')}`;

  return { html, text };
}
