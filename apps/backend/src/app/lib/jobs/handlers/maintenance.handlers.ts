import type { Kysely } from 'kysely';
import { sql } from 'kysely';
import type { Models } from '../../../../../../../libs/common/src/lib/kysely.models';
import { fingerprintFull, fingerprintStreet } from '../../address-normalize';
import { geocodeAndMapHousehold } from '../../gis/geocoding';
import { logger } from '../../../logger';
import { ActivityController } from '../../../modules/activity/controller';
import { ListsController } from '../../../modules/lists/controller';
import { DuplicateMaintenanceService } from '../../../modules/persons/services/duplicate-maintenance.service';
import type { JobPayloadOf } from '../job-payloads';
import { DAY_MS, scheduleNextRun } from '../reschedule';

export async function handleRefreshList(payload: JobPayloadOf<'refresh_list'>): Promise<void> {
  const listsController = new ListsController();
  await listsController.executeListRefresh(payload.tenant_id, payload.list_id, payload.user_id);
}

export async function handleEnrichCompanyGoogle(
  payload: JobPayloadOf<'enrich_company_google'>,
  db: Kysely<Models>,
): Promise<void> {
  const { CompaniesEnrichmentService } =
    await import('../../../modules/companies/services/companies-enrichment.service');
  const enrichmentSvc = new CompaniesEnrichmentService(db);
  await enrichmentSvc.enrichCompany(payload.company_id, payload.tenant_id);
}

export async function handleRefreshCompaniesGoogle(
  payload: JobPayloadOf<'refresh_companies_google'>,
  db: Kysely<Models>,
): Promise<void> {
  const { CompaniesEnrichmentService } =
    await import('../../../modules/companies/services/companies-enrichment.service');
  const enrichmentSvc = new CompaniesEnrichmentService(db);
  await enrichmentSvc.queueUnenrichedCompanies(payload.tenant_id ?? undefined);

  // Only the global (cron-style) run reschedules itself.
  if (!payload.tenant_id) {
    await scheduleNextRun(db, 'refresh_companies_google', DAY_MS);
  }
}

export async function handleCleanupActivities(db: Kysely<Models>): Promise<void> {
  const activityController = new ActivityController();
  await activityController.deleteOldActivities();

  await scheduleNextRun(db, 'cleanup_activities', DAY_MS);
}

// P-3 (schema review 2026-07-06, §5): retention for the append-mostly tables
// that otherwise grow without bound. user_activity and newsletter_events already
// have their own prune jobs (cleanup_activities / prune_newsletter_events); this
// covers the remaining three. Deletes run in bounded batches so a large backlog
// never takes a long lock or a huge WAL spike.
const RETENTION_BATCH = 5000;
const COMPLETED_JOBS_RETENTION_DAYS = 30;
const WEBHOOK_EVENTS_RETENTION_DAYS = 90;
const EXPIRED_SESSION_GRACE_DAYS = 30;

async function deleteInBatches(runOnce: () => Promise<bigint>): Promise<bigint> {
  let total = 0n;
  for (;;) {
    const deleted = await runOnce();
    total += deleted;
    if (deleted < BigInt(RETENTION_BATCH)) break;
  }
  return total;
}

export async function handlePruneRetention(db: Kysely<Models>): Promise<void> {
  // Completed/failed background jobs older than the retention window. The
  // currently-'processing' retention job itself is never matched.
  const prunedJobs = await deleteInBatches(async () => {
    const res = await sql`
      DELETE FROM background_jobs
      WHERE ctid IN (
        SELECT ctid FROM background_jobs
        WHERE status IN ('completed', 'failed')
          AND updated_at < now() - make_interval(days => ${COMPLETED_JOBS_RETENTION_DAYS})
        LIMIT ${RETENTION_BATCH})
    `.execute(db);
    return res.numAffectedRows ?? 0n;
  });

  // Processed Stripe/webhook events past their retention window.
  const prunedWebhooks = await deleteInBatches(async () => {
    const res = await sql`
      DELETE FROM webhook_events
      WHERE ctid IN (
        SELECT ctid FROM webhook_events
        WHERE status = 'processed'
          AND processed_at < now() - make_interval(days => ${WEBHOOK_EVENTS_RETENTION_DAYS})
        LIMIT ${RETENTION_BATCH})
    `.execute(db);
    return res.numAffectedRows ?? 0n;
  });

  // Long-expired sessions (revocation/sign-out handles the live ones; this sweeps
  // the rows that just linger). NULL expires_at means non-expiring — left alone.
  const prunedSessions = await deleteInBatches(async () => {
    const res = await sql`
      DELETE FROM sessions
      WHERE ctid IN (
        SELECT ctid FROM sessions
        WHERE expires_at IS NOT NULL
          AND expires_at < now() - make_interval(days => ${EXPIRED_SESSION_GRACE_DAYS})
        LIMIT ${RETENTION_BATCH})
    `.execute(db);
    return res.numAffectedRows ?? 0n;
  });

  logger.info(
    {
      prunedJobs: prunedJobs.toString(),
      prunedWebhooks: prunedWebhooks.toString(),
      prunedSessions: prunedSessions.toString(),
    },
    'Retention prune complete',
  );

  await scheduleNextRun(db, 'prune_retention', DAY_MS);
}

export async function handleRecomputeAllDuplicates(db: Kysely<Models>): Promise<void> {
  const lastJob = await db
    .selectFrom('background_jobs')
    .select(['updated_at'])
    .where('status', '=', 'completed')
    .where(sql`payload->>'type'`, '=', 'recompute_all_duplicates')
    .orderBy('updated_at', 'desc')
    .limit(1)
    .executeTakeFirst();

  const tenants = await db.selectFrom('tenants').select('id').execute();
  const maintenanceSvc = new DuplicateMaintenanceService();
  const lastRunTime = lastJob?.updated_at ? new Date(lastJob.updated_at) : null;

  for (const tenant of tenants) {
    try {
      let shouldRecompute = true;

      if (lastRunTime) {
        const personChanged = await db
          .selectFrom('persons')
          .select('id')
          .where('tenant_id', '=', String(tenant.id))
          .where('updated_at', '>', lastRunTime)
          .limit(1)
          .executeTakeFirst();

        const householdChanged = await db
          .selectFrom('households')
          .select('id')
          .where('tenant_id', '=', String(tenant.id))
          .where('updated_at', '>', lastRunTime)
          .limit(1)
          .executeTakeFirst();

        const companyChanged = await db
          .selectFrom('companies')
          .select('id')
          .where('tenant_id', '=', String(tenant.id))
          .where('updated_at', '>', lastRunTime)
          .limit(1)
          .executeTakeFirst();

        if (!personChanged && !householdChanged && !companyChanged) {
          shouldRecompute = false;
        }
      }

      if (shouldRecompute) {
        await maintenanceSvc.recomputeAllDuplicates(String(tenant.id));
      }
    } catch (tenantErr) {
      logger.error({ err: tenantErr }, `Failed to recompute duplicates for tenant ${tenant.id}`);
    }
  }

  await scheduleNextRun(db, 'recompute_all_duplicates', DAY_MS);
}

export async function handleRecomputeAddressFingerprints(
  payload: JobPayloadOf<'recompute_address_fingerprints'>,
  db: Kysely<Models>,
): Promise<void> {
  const tenantIds: string[] = [];
  if (payload.tenant_id) {
    tenantIds.push(payload.tenant_id);
  } else {
    const tenants = await db.selectFrom('tenants').select('id').execute();
    for (const tenant of tenants) {
      tenantIds.push(String(tenant.id));
    }
  }

  for (const tenantId of tenantIds) {
    try {
      await recomputeTenantAddressFingerprints(tenantId, db);
    } catch (tenantErr) {
      logger.error({ err: tenantErr }, `Failed to recompute address fingerprints for tenant ${tenantId}`);
    }
  }

  // Schedule next run 24 hours later if periodic/cron-like (no tenant_id)
  if (!payload.tenant_id) {
    await scheduleNextRun(db, 'recompute_address_fingerprints', DAY_MS);
  }
}

export async function handleGeocodeHousehold(
  payload: JobPayloadOf<'geocode_household'>,
  db: Kysely<Models>,
): Promise<void> {
  await geocodeAndMapHousehold(payload.household_id, payload.tenant_id, db);
}

async function recomputeTenantAddressFingerprints(tenantId: string, db: Kysely<Models>): Promise<void> {
  const households = await db.selectFrom('households').selectAll().where('tenant_id', '=', tenantId).execute();

  for (const hh of households) {
    const fp_street = fingerprintStreet({
      street_num: hh.street_num,
      street1: hh.street1,
      street2: hh.street2,
    });
    const fp_full = fingerprintFull({
      apt: hh.apt,
      street_num: hh.street_num,
      street1: hh.street1,
      street2: hh.street2,
      city: hh.city,
      state: hh.state,
      zip: hh.zip,
      country: hh.country,
    });

    if (hh.address_fp_street !== fp_street || hh.address_fp_full !== fp_full) {
      await db
        .updateTable('households')
        .set({
          address_fp_street: fp_street,
          address_fp_full: fp_full,
          updated_at: new Date(),
        })
        .where('id', '=', hh.id)
        .where('tenant_id', '=', tenantId)
        .execute();
    }
  }

  const maintenanceSvc = new DuplicateMaintenanceService();
  await maintenanceSvc.recomputeAllDuplicates(tenantId);
}
