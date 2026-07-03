import type { Kysely } from 'kysely';
import { sql } from 'kysely';
import { env } from '../../../../env';
import type { Models } from '../../../../../../../libs/common/src/lib/kysely.models';
import { logger } from '../../../logger';
import { GoogleOAuthService } from '../../../modules/google-sync/google-oauth.service';
import { GoogleSyncService } from '../../../modules/google-sync/google-sync.service';
import { MsOAuthService } from '../../../modules/ms-sync/ms-oauth.service';
import { MsSyncService } from '../../../modules/ms-sync/ms-sync.service';
import type { JobPayloadOf } from '../job-payloads';
import { scheduleNextRun, TEN_MINUTES_MS } from '../reschedule';

export async function handleScheduleSyncJobs(db: Kysely<Models>): Promise<void> {
  await queueUserSyncJobs(db);

  await scheduleNextRun(db, 'schedule_sync_jobs', TEN_MINUTES_MS);
}

export async function handleGoogleSync(payload: JobPayloadOf<'google_sync'>, db: Kysely<Models>): Promise<void> {
  const oauthSvc = new GoogleOAuthService(db, {
    clientId: env.googleClientId ?? '',
    clientSecret: env.googleClientSecret ?? '',
    redirectUri: env.googleRedirectUri ?? `${env.apiUrl}/auth/google/callback`,
  });
  const syncSvc = new GoogleSyncService(db, oauthSvc);
  await syncSvc.syncTenant(payload.tenantId, payload.requestedBy);
}

export async function handleMsSync(payload: JobPayloadOf<'ms_sync'>, db: Kysely<Models>): Promise<void> {
  const oauthSvc = new MsOAuthService(db, {
    clientId: env.msClientId ?? '',
    clientSecret: env.msClientSecret ?? '',
    tenantId: env.msTenantId ?? 'common',
    redirectUri: env.msRedirectUri ?? `${env.apiUrl}/auth/ms/callback`,
  });
  const syncSvc = new MsSyncService(db, oauthSvc);
  await syncSvc.syncTenant(payload.tenantId, payload.requestedBy);
}

async function queueUserSyncJobs(db: Kysely<Models>): Promise<void> {
  try {
    // Find all tenants with a connected Google account
    const googleTokens = await db.selectFrom('google_oauth_tokens').select('tenant_id').execute();

    for (const token of googleTokens) {
      const tenantId = String(token.tenant_id);

      // Check if there is already a pending or processing sync job for this tenant
      const existing = await db
        .selectFrom('background_jobs')
        .select('id')
        .where('status', 'in', ['pending', 'processing'])
        .where(sql`payload->>'type'`, '=', 'google_sync')
        .where(sql`payload->>'tenantId'`, '=', tenantId)
        .executeTakeFirst();

      if (!existing) {
        logger.info(`Auto-scheduling Google sync job for tenant ${tenantId}`);
        await db
          .insertInto('background_jobs')
          .values({
            tenant_id: tenantId,
            queue: 'default',
            status: 'pending',
            payload: JSON.stringify({
              type: 'google_sync',
              tenantId,
              requestedBy: 'system',
            }),
            run_at: new Date(),
            max_attempts: 3,
          })
          .execute();
      }
    }

    // Find all tenants with a connected Microsoft account
    const msTokens = await db.selectFrom('ms_oauth_tokens').select('tenant_id').execute();

    for (const token of msTokens) {
      const tenantId = String(token.tenant_id);

      // Check if there is already a pending or processing sync job for this tenant
      const existing = await db
        .selectFrom('background_jobs')
        .select('id')
        .where('status', 'in', ['pending', 'processing'])
        .where(sql`payload->>'type'`, '=', 'ms_sync')
        .where(sql`payload->>'tenantId'`, '=', tenantId)
        .executeTakeFirst();

      if (!existing) {
        logger.info(`Auto-scheduling MS sync job for tenant ${tenantId}`);
        await db
          .insertInto('background_jobs')
          .values({
            tenant_id: tenantId,
            queue: 'default',
            status: 'pending',
            payload: JSON.stringify({
              type: 'ms_sync',
              tenantId,
              requestedBy: 'system',
            }),
            run_at: new Date(),
            max_attempts: 3,
          })
          .execute();
      }
    }
  } catch (err) {
    logger.error({ err }, 'Failed to queue tenant sync jobs');
  }
}
