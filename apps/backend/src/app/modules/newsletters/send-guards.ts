import type { Kysely, Transaction } from 'kysely';
import { sql } from 'kysely';

import { getPlanDef, type PlanKey } from '@common';
import type { Models } from '../../../../../../libs/common/src/lib/kysely.models';
import { ForbiddenError, NotFoundError, PreconditionFailedError, TooManyRequestsError } from '../../errors/app-errors';
import { logger } from '../../logger';

/**
 * Anti-abuse guards around bulk (newsletter) sending. Free accounts are the spam vector — a
 * throwaway signup must not be able to blast a purchased list — so sending is gated on real
 * identity (verified DKIM domain, and on Free a verified mobile number), throttled while an
 * account is new, and automatically shut off when a send's engagement shows list abuse
 * (hard bounces = purchased/scraped list, spam complaints = non-consenting recipients).
 *
 * Enforcement points:
 *  - `assertTenantMaySendNewsletter` — pre-send, in NewslettersController.sendNewsletter.
 *  - `assertTenantSendingNotBlocked` + the caps — per batch, in the send-newsletter job handler
 *    (so an in-flight send stops mid-batch when a tripwire fires).
 *  - `applyEngagementTripwires` — in the SendGrid event webhook after aggregates recompute.
 */

/** New Free tenants are warmed up: at most this many newsletter emails per rolling day… */
export const FREE_WARMUP_DAILY_CAP = 100;
/** …for this many days after tenant creation. */
export const FREE_WARMUP_DAYS = 7;

/** Per-tenant rolling-hour send ceilings enforced by the outbox worker (queue fairness +
 * blast-radius cap; a deferred send resumes automatically). */
export const HOURLY_SEND_CAPS: Record<PlanKey, number> = {
  free: 500,
  grassroots: 5_000,
  movement: 20_000,
  enterprise: 50_000,
};

/** Tripwires need a minimum sample so one bad address on a tiny send doesn't pause a tenant. */
export const TRIPWIRE_MIN_RECIPIENTS = 20;
/** Hard-bounce rate above which sending is paused (a clean opt-in list bounces ~1–2%). */
export const HARD_BOUNCE_PAUSE_RATE = 0.05;
/** Spam-complaint rate above which the whole account is suspended pending human review. */
export const SPAM_COMPLAINT_SUSPEND_RATE = 0.01;

export const SENDING_SUSPENDED_MESSAGE =
  'This account is suspended pending a review of recent sending activity. Please contact support.';
export const SENDING_PAUSED_MESSAGE =
  'Sending is paused: a recent newsletter had an unusually high bounce rate, which usually means the list contains addresses that never opted in. Please contact support to review and resume sending.';
export const DOMAIN_UNVERIFIED_MESSAGE =
  'Before sending, verify the domain you send from (Settings → Domains) and choose a default From address on that domain (Settings → Communications). This protects your deliverability.';
export const PHONE_UNVERIFIED_MESSAGE =
  'On the Free plan, verify a mobile phone number (Settings → Communications) before your first newsletter send.';

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;

type Db = Kysely<Models> | Transaction<Models>;

export interface SendingTenant {
  id: string;
  plan: PlanKey;
  created_at: Date | null;
  suspended_at: Date | null;
  sending_paused_at: Date | null;
  sending_phone_verified_at: Date | null;
}

/** Resolve a stored plan value to its key, treating unknown/absent as free (fail closed). */
export function planKeyOf(planName: string | null | undefined): PlanKey {
  return getPlanDef(planName)?.key ?? 'free';
}

/** The tenant's daily warm-up cap, or null when no warm-up applies (paid plan or account older
 * than the warm-up window). Pure, so the cap math is unit-testable. */
export function warmupDailyCap(plan: PlanKey, createdAt: Date | null, now: Date): number | null {
  if (plan !== 'free') return null;
  if (!createdAt) return FREE_WARMUP_DAILY_CAP; // unknown age: fail closed
  const ageMs = now.getTime() - createdAt.getTime();
  return ageMs < FREE_WARMUP_DAYS * DAY_MS ? FREE_WARMUP_DAILY_CAP : null;
}

/** Which tripwire, if any, a send's engagement stats have crossed. Pure for unit tests. */
export function evaluateTripwires(stats: {
  totalRecipients: number;
  hardBounces: number;
  spamReports: number;
}): 'suspend' | 'pause' | null {
  if (stats.totalRecipients < TRIPWIRE_MIN_RECIPIENTS) return null;
  if (stats.spamReports / stats.totalRecipients > SPAM_COMPLAINT_SUSPEND_RATE) return 'suspend';
  if (stats.hardBounces / stats.totalRecipients > HARD_BOUNCE_PAUSE_RATE) return 'pause';
  return null;
}

export async function loadSendingTenant(db: Db, tenantId: string): Promise<SendingTenant> {
  const row = await db
    .selectFrom('tenants')
    .select(['id', 'subscription_plan', 'created_at', 'suspended_at', 'sending_paused_at', 'sending_phone_verified_at'])
    .where('id', '=', tenantId)
    .executeTakeFirst();
  if (!row) throw new NotFoundError('Organization not found');
  const toDate = (v: Date | string | null): Date | null => (v == null ? null : new Date(v));
  return {
    id: String(row.id),
    plan: planKeyOf(row.subscription_plan),
    created_at: toDate(row.created_at),
    suspended_at: toDate(row.suspended_at),
    sending_paused_at: toDate(row.sending_paused_at),
    sending_phone_verified_at: toDate(row.sending_phone_verified_at),
  };
}

/** Throws when the tenant is suspended or its sending is tripwire-paused. */
export function assertTenantSendingNotBlocked(tenant: SendingTenant): void {
  if (tenant.suspended_at) throw new ForbiddenError(SENDING_SUSPENDED_MESSAGE);
  if (tenant.sending_paused_at) throw new ForbiddenError(SENDING_PAUSED_MESSAGE);
}

/** SUM of newsletter emails handed to SendGrid for this tenant since `since`. */
export async function sentEmailsSince(db: Db, tenantId: string, since: Date): Promise<number> {
  const row = await db
    .selectFrom('newsletter_send_log')
    .select((eb) => eb.fn.coalesce(eb.fn.sum('recipient_count'), sql<number>`0`).as('total'))
    .where('tenant_id', '=', tenantId)
    .where('created_at', '>=', since)
    .executeTakeFirst();
  return Number(row?.total ?? 0);
}

/** Record one delivered batch — the data the warm-up and hourly caps meter. */
export async function logNewsletterBatch(
  db: Db,
  tenantId: string,
  newsletterId: string,
  recipientCount: number,
): Promise<void> {
  if (recipientCount <= 0) return;
  await db
    .insertInto('newsletter_send_log')
    .values({ tenant_id: tenantId, newsletter_id: newsletterId, recipient_count: recipientCount })
    .execute();
}

/** True when the tenant's default From address belongs to a DKIM-verified sending domain. */
export async function hasVerifiedSendingDomain(db: Db, tenantId: string): Promise<boolean> {
  const rows = await db
    .selectFrom('settings')
    .select(['key', 'value'])
    .where('tenant_id', '=', tenantId)
    .where('key', 'in', ['communications.default_from_email', 'communications.verified_domains'])
    .execute();
  let fromEmail = '';
  let domains: { domain?: string; status?: string }[] = [];
  for (const row of rows) {
    if (row.key === 'communications.default_from_email' && typeof row.value === 'string') {
      fromEmail = row.value.toLowerCase().trim();
    } else if (row.key === 'communications.verified_domains' && Array.isArray(row.value)) {
      domains = row.value as { domain?: string; status?: string }[];
    }
  }
  const fromDomain = fromEmail.split('@')[1];
  if (!fromDomain) return false;
  return domains.some((d) => d.domain === fromDomain && d.status === 'verified');
}

/**
 * The pre-send gate. Ordered so the most actionable message wins: blocked states first, then
 * identity prerequisites, then the warm-up volume cap.
 */
export async function assertTenantMaySendNewsletter(
  db: Db,
  tenantId: string,
  plannedRecipients: number,
): Promise<void> {
  const tenant = await loadSendingTenant(db, tenantId);
  assertTenantSendingNotBlocked(tenant);

  if (!(await hasVerifiedSendingDomain(db, tenantId))) {
    throw new PreconditionFailedError(DOMAIN_UNVERIFIED_MESSAGE);
  }
  if (tenant.plan === 'free' && !tenant.sending_phone_verified_at) {
    throw new PreconditionFailedError(PHONE_UNVERIFIED_MESSAGE);
  }

  const now = new Date();
  const cap = warmupDailyCap(tenant.plan, tenant.created_at, now);
  if (cap != null) {
    const sentToday = await sentEmailsSince(db, tenantId, new Date(now.getTime() - DAY_MS));
    if (sentToday + plannedRecipients > cap) {
      const remaining = Math.max(0, cap - sentToday);
      throw new TooManyRequestsError(
        `During your first ${FREE_WARMUP_DAYS} days on the Free plan you can send up to ${cap} emails per day. ` +
          `This newsletter has ${plannedRecipients.toLocaleString()} recipients and ${remaining} remain today — ` +
          `narrow the audience or try again tomorrow.`,
      );
    }
  }
}

/**
 * How many more emails the tenant may send right now under the hourly cap and (if active) the
 * warm-up daily cap. The worker trims batches to this and defers when it reaches 0.
 */
export async function remainingSendAllowance(db: Db, tenant: SendingTenant, now: Date): Promise<number> {
  const hourly = HOURLY_SEND_CAPS[tenant.plan];
  const sentLastHour = await sentEmailsSince(db, tenant.id, new Date(now.getTime() - HOUR_MS));
  let allowance = Math.max(0, hourly - sentLastHour);

  const dailyCap = warmupDailyCap(tenant.plan, tenant.created_at, now);
  if (dailyCap != null) {
    const sentToday = await sentEmailsSince(db, tenant.id, new Date(now.getTime() - DAY_MS));
    allowance = Math.min(allowance, Math.max(0, dailyCap - sentToday));
  }
  return allowance;
}

/** Tripwire pause: newsletter sending only. Idempotent — an already-paused tenant is left as is. */
export async function pauseTenantSending(db: Db, tenantId: string, reason: string): Promise<void> {
  await db
    .updateTable('tenants')
    .set({ sending_paused_at: new Date(), sending_paused_reason: reason })
    .where('id', '=', tenantId)
    .where('sending_paused_at', 'is', null)
    .execute();
}

/** Tripwire suspension: blocks sign-in (auth checks suspended_at) AND sending. Idempotent. */
export async function suspendTenant(db: Db, tenantId: string, reason: string): Promise<void> {
  await db
    .updateTable('tenants')
    .set({ suspended_at: new Date() })
    .where('id', '=', tenantId)
    .where('suspended_at', 'is', null)
    .execute();
  await pauseTenantSending(db, tenantId, reason);
}

/**
 * Evaluate a newsletter's engagement against the abuse tripwires and pause/suspend its tenant.
 * Called from the SendGrid event webhook after each aggregate recompute. Uses hard bounces only
 * (SendGrid `bounce` events excluding the soft `blocked` sub-type) so soft failures and
 * suppression `dropped` events never count against the tenant.
 */
export async function applyEngagementTripwires(db: Db, tenantId: string, newsletterId: string): Promise<void> {
  const newsletter = await db
    .selectFrom('newsletters')
    .select(['total_recipients', 'name'])
    .where('tenant_id', '=', tenantId)
    .where('id', '=', newsletterId)
    .executeTakeFirst();
  const totalRecipients = Number(newsletter?.total_recipients ?? 0);
  if (totalRecipients < TRIPWIRE_MIN_RECIPIENTS) return;

  const stats = await db
    .selectFrom('newsletter_events')
    .select([
      sql<number>`COUNT(DISTINCT email) FILTER (WHERE event_type = 'bounce' AND COALESCE(bounce_type, '') <> 'blocked')`.as(
        'hard_bounces',
      ),
      sql<number>`COUNT(DISTINCT email) FILTER (WHERE event_type = 'spamreport')`.as('spam_reports'),
    ])
    .where('tenant_id', '=', tenantId)
    .where('newsletter_id', '=', newsletterId)
    .executeTakeFirst();

  const hardBounces = Number(stats?.hard_bounces ?? 0);
  const spamReports = Number(stats?.spam_reports ?? 0);
  const verdict = evaluateTripwires({ totalRecipients, hardBounces, spamReports });
  if (!verdict) return;

  if (verdict === 'suspend') {
    logger.error(
      { tenantId, newsletterId, totalRecipients, spamReports, newsletterName: newsletter?.name },
      '[abuse-tripwire] Spam-complaint rate exceeded — tenant suspended pending human review',
    );
    await suspendTenant(db, tenantId, `spam_complaint_rate:${newsletterId}`);
  } else {
    logger.error(
      { tenantId, newsletterId, totalRecipients, hardBounces, newsletterName: newsletter?.name },
      '[abuse-tripwire] Hard-bounce rate exceeded — tenant sending paused',
    );
    await pauseTenantSending(db, tenantId, `hard_bounce_rate:${newsletterId}`);
  }
}
