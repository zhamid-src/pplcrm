import type { Kysely } from 'kysely';
import { sql } from 'kysely';
import { ALL_FOLDERS } from '../../../../../../libs/common/src/lib/emails';
import { env } from '../../../env';
import { TransactionalEmailService } from '../../lib/mail/transactional-mail.service';
import { logger } from '../../logger';
import { SettingsRepo } from '../settings/repositories/settings.repo';

export interface PlanLimits {
  price: string;
  contacts: number;
  seats: number;
  emails: number;
}

const settingsRepo = new SettingsRepo();
const mailService = new TransactionalEmailService();

export function getPlanLimits(planName: string | null | undefined): PlanLimits {
  switch (planName?.toLowerCase()) {
    case 'grassroots':
      return { price: '$49/month', contacts: 5000, seats: 3, emails: 5000 };
    case 'representative':
      return { price: '$199/month', contacts: 50000, seats: 10, emails: 50000 };
    default:
      // Free / Trial Tier
      return { price: '$0/month (Free Trial)', contacts: 500, seats: 1, emails: 500 };
  }
}

export async function checkTenantUsage(tenantId: string, db: Kysely<any>): Promise<void> {
  const tenant = await db.selectFrom('tenants').selectAll().where('id', '=', BigInt(tenantId)).executeTakeFirst();

  if (!tenant) {
    logger.error(`[checkTenantUsage] Tenant not found: ${tenantId}`);
    return;
  }

  const planName = (tenant['subscription_plan'] as string) || 'free';
  const planLimits = getPlanLimits(planName);

  // 1. Count Contacts (Persons)
  const contactsCountRow = await db
    .selectFrom('persons')
    .select(db.fn.countAll().as('cnt'))
    .where('tenant_id', '=', tenantId)
    .executeTakeFirst();
  const currentContacts = Number(contactsCountRow?.cnt || 0);

  // 2. Count Active User Seats
  const seatsCountRow = await db
    .selectFrom('authusers')
    .select(db.fn.countAll().as('cnt'))
    .where('tenant_id', '=', tenantId)
    .where('deletion_scheduled_at', 'is', null)
    .executeTakeFirst();
  const currentSeats = Number(seatsCountRow?.cnt || 0);

  // 3. Count Outbound Emails within Current Billing Cycle
  const endsAt = tenant['subscription_ends_at']
    ? new Date(tenant['subscription_ends_at'] as string | number | Date)
    : null;
  let billingCycleStart = new Date();
  billingCycleStart.setDate(billingCycleStart.getDate() - 30); // fallback: last 30 days
  if (endsAt) {
    const candidateStart = new Date(endsAt);
    candidateStart.setMonth(candidateStart.getMonth() - 1);
    while (candidateStart > new Date()) {
      candidateStart.setMonth(candidateStart.getMonth() - 1);
    }
    billingCycleStart = candidateStart;
  }

  const emailsCountRow = await db
    .selectFrom('emails')
    .select(db.fn.countAll().as('cnt'))
    .where('tenant_id', '=', tenantId)
    .where('folder_id', '=', ALL_FOLDERS.SENT)
    .where('created_at', '>=', billingCycleStart)
    .executeTakeFirst();
  const emailsSent = Number(emailsCountRow?.cnt || 0);

  const newslettersCountRow = await db
    .selectFrom('newsletters')
    .select(db.fn.sum('delivered_count').as('cnt'))
    .where('tenant_id', '=', tenantId)
    .where('status', '=', 'sent')
    .where('send_date', '>=', billingCycleStart)
    .executeTakeFirst();
  const newslettersSent = Number(newslettersCountRow?.cnt || 0);

  const totalEmailsSent = emailsSent + newslettersSent;

  // Retrieve existing warning status from settings
  const alertSettingsRow = await settingsRepo.getByKey({
    tenant_id: tenantId,
    key: 'billing.limit_alerts_sent',
  });
  let alertSettings: Record<string, boolean> = {};
  if (alertSettingsRow?.value) {
    const val = alertSettingsRow.value;
    const parsed = typeof val === 'string' ? JSON.parse(val) : val;
    if (parsed && typeof parsed === 'object') {
      alertSettings = { ...parsed };
    }
  }

  let settingsChanged = false;

  const resources = [
    {
      name: 'contacts list',
      key: 'contacts',
      current: currentContacts,
      limit: planLimits.contacts,
      unit: 'voter contacts',
    },
    {
      name: 'user seats',
      key: 'seats',
      current: currentSeats,
      limit: planLimits.seats,
      unit: 'active users',
    },
    {
      name: 'outbound emails',
      key: 'emails',
      current: totalEmailsSent,
      limit: planLimits.emails,
      unit: 'sent emails',
    },
  ];

  const adminsList: { email: string; first_name: string }[] = [];

  for (const resource of resources) {
    const pct = resource.limit ? (resource.current / resource.limit) * 100 : 0;
    const flag90 = `${resource.key}_90`;
    const flag100 = `${resource.key}_100`;

    // Handle 100% capacity limit hit
    if (pct >= 100) {
      if (!alertSettings[flag100]) {
        alertSettings[flag100] = true;
        alertSettings[flag90] = true; // Auto-set 90% if we skipped directly to 100%
        settingsChanged = true;
        await sendLimitEmail(tenantId, tenant['name'] as string, planName, resource, 100, adminsList, db);
      }
    } else {
      // Reset 100% flag if usage drops below 100%
      if (alertSettings[flag100]) {
        alertSettings[flag100] = false;
        settingsChanged = true;
      }

      // Handle 90% limit hit
      if (pct >= 90) {
        if (!alertSettings[flag90]) {
          alertSettings[flag90] = true;
          settingsChanged = true;
          await sendLimitEmail(tenantId, tenant['name'] as string, planName, resource, 90, adminsList, db);
        }
      } else {
        // Reset 90% flag if usage drops below 90%
        if (alertSettings[flag90]) {
          alertSettings[flag90] = false;
          settingsChanged = true;
        }
      }
    }
  }

  if (settingsChanged) {
    const adminUserId = tenant['admin_id'] ? String(tenant['admin_id']) : '1';
    await settingsRepo.upsertMany({
      tenant_id: tenantId,
      user_id: adminUserId,
      entries: [
        {
          key: 'billing.limit_alerts_sent',
          value: alertSettings,
        },
      ],
    });
  }
}

async function sendLimitEmail(
  tenantId: string,
  tenantName: string,
  planName: string,
  resource: { name: string; current: number; limit: number; unit: string },
  pct: 90 | 100,
  adminsCache: { email: string; first_name: string }[],
  db: Kysely<any>,
): Promise<void> {
  if (adminsCache.length === 0) {
    const admins = await db
      .selectFrom('authusers')
      .select(['email', 'first_name'])
      .where('tenant_id', '=', tenantId)
      .where((eb: any) =>
        eb.or([
          eb('role', '=', 'admin'),
          eb('id', '=', BigInt(tenantId) as any), // admin fallback
        ]),
      )
      .where('deletion_scheduled_at', 'is', null)
      .execute();
    adminsCache.push(...(admins as any));
  }

  const billingPageUrl = `${env.appUrl}/settings?tab=billing`;
  const planNameUpper = planName.toUpperCase();
  const alertTag = pct === 100 ? '[WARNING]' : '[ALERT]';
  const prefix = pct === 100 ? 'reached' : 'approaching';

  const subject = `${alertTag} Action Required: You have ${prefix} your ${resource.limit.toLocaleString()} ${resource.unit} limit`;
  const text = `Hi,

Your organization "${tenantName}" has reached ${pct}% of its ${resource.name} capacity limit under the ${planNameUpper} plan.

Current Usage: ${resource.current.toLocaleString()} / ${resource.limit.toLocaleString()} ${resource.unit} (${pct}%).

To prevent disruption to your workflows and ensure continued access, please upgrade your subscription plan.

Upgrade Options:
- Grassroots Plan ($49/month): Up to 5,000 contacts, 3 user seats, and 5,000 monthly emails.
- Representative Plan ($199/month): Up to 50,000 contacts, 10 user seats, and 50,000 monthly emails.

Update your subscription tier here: ${billingPageUrl}

Thank you,
The PplCRM Team`;

  const html = `<p>Hi,</p>
<p>Your organization <strong>${tenantName}</strong> has reached <strong>${pct}%</strong> of its ${resource.name} capacity limit under the <strong>${planNameUpper}</strong> plan.</p>
<p><strong>Current Usage:</strong> ${resource.current.toLocaleString()} / ${resource.limit.toLocaleString()} ${resource.unit} (${pct}%).</p>
<p><strong>[${pct === 100 ? 'WARNING' : 'IMPORTANT'}]</strong> To prevent disruption to your workflows and ensure continued access, please upgrade your subscription plan.</p>
<p><strong>Upgrade Tiers:</strong></p>
<ul>
  <li><strong>Grassroots Plan ($49/month):</strong> Up to 5,000 contacts, 3 user seats, and 5,000 monthly emails.</li>
  <li><strong>Representative Plan ($199/month):</strong> Up to 50,000 contacts, 10 user seats, and 50,000 monthly emails.</li>
</ul>
<p><a href="${billingPageUrl}">Upgrade Subscription Plan</a></p>`;

  for (const admin of adminsCache) {
    if (admin.email) {
      try {
        await mailService.enqueueMail({
          to: admin.email,
          tenant_id: tenantId,
          subject,
          text,
          html,
        });
      } catch (err) {
        logger.error({ err }, `Failed to send limit notification email to ${admin.email}`);
      }
    }
  }
}

export async function checkAllUsageLimits(db: Kysely<any>): Promise<void> {
  const tenants = await db.selectFrom('tenants').select('id').execute();
  for (const tenant of tenants) {
    try {
      await checkTenantUsage(String(tenant['id']), db);
    } catch (err) {
      logger.error({ err }, `Failed to check usage limits for tenant ${tenant['id']}`);
    }
  }
}

export async function queueUsageLimitCheck(tenantId: string, db: any): Promise<void> {
  // Check if there is already a pending limits check job for this tenant
  const existing = await db
    .selectFrom('background_jobs')
    .select('id')
    .where('tenant_id', '=', tenantId)
    .where('status', '=', 'pending')
    .where(sql.raw("payload->>'type'"), '=', 'check_usage_limits')
    .executeTakeFirst();

  if (!existing) {
    await db
      .insertInto('background_jobs')
      .values({
        tenant_id: tenantId,
        queue: 'default',
        status: 'pending',
        payload: JSON.stringify({ type: 'check_usage_limits', tenant_id: tenantId }),
        run_at: new Date(),
        max_attempts: 3,
      })
      .execute();
  }
}
