import { authProcedure, router } from '../../../trpc';
import { GoogleOAuthService, NEEDS_FULL_SYNC } from './google-oauth.service';
import { GoogleSyncService } from './google-sync.service';
import { BaseRepository } from '../../lib/base.repo';
import { env } from '../../../env';
import { z } from 'zod';
import { idSchema } from '@common';
import { sql } from 'kysely';
import { encodeOAuthState } from '../../lib/oauth-state';
import { assertNotDemoMode } from '../demo/demo-guard';

let _oauthSvc: GoogleOAuthService | null = null;
let _syncSvc: GoogleSyncService | null = null;

function getServices() {
  if (!_oauthSvc || !_syncSvc) {
    const db = (BaseRepository as any)['_db']; // reuse the shared Kysely instance
    _oauthSvc = new GoogleOAuthService(db, {
      clientId: env.googleClientId ?? '',
      clientSecret: env.googleClientSecret ?? '',
      redirectUri: env.googleRedirectUri ?? `${env.apiUrl}/auth/google/callback`,
    });
    _syncSvc = new GoogleSyncService(db, _oauthSvc);
  }
  return { oauthSvc: _oauthSvc, syncSvc: _syncSvc };
}

// Campaigns §15 — mailbox connections are per-campaign; the client supplies the
// active context (the same activeCampaignId() it passes everywhere).
const campaignInput = z.object({ campaignId: idSchema });

function getAuthUrl() {
  return authProcedure
    .input(z.object({ campaignId: idSchema, returnTo: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      // Mailbox sync is configuration — locked during the demo test drive.
      await assertNotDemoMode(BaseRepository.dbInstance, ctx.auth.tenant_id);
      const { oauthSvc } = getServices();
      const state = encodeOAuthState({
        userId: ctx.auth.user_id,
        tenantId: ctx.auth.tenant_id,
        campaignId: input.campaignId,
        returnTo: input.returnTo,
      });
      const url = oauthSvc.getAuthUrl(state);
      return { url };
    });
}

function getConnectionStatus() {
  return authProcedure.input(campaignInput).query(async ({ ctx, input }) => {
    const { oauthSvc } = getServices();
    const db = (BaseRepository as any)['_db'];
    const status = await oauthSvc.getConnectionStatus(ctx.auth.tenant_id, input.campaignId);

    const activeJob = await db
      .selectFrom('background_jobs')
      .select('id')
      .where('status', 'in', ['pending', 'processing'])
      .where('tenant_id', '=', ctx.auth.tenant_id)
      .where(sql`payload->>'type'`, '=', 'google_sync')
      .where(sql`payload->>'campaignId'`, '=', input.campaignId)
      .executeTakeFirst();

    return {
      ...status,
      syncing: !!activeJob,
    };
  });
}

function syncNow() {
  return authProcedure.input(campaignInput).mutation(async ({ ctx, input }) => {
    const db = (BaseRepository as any)['_db'];

    const existing = await db
      .selectFrom('background_jobs')
      .select('id')
      .where('status', 'in', ['pending', 'processing'])
      .where('tenant_id', '=', ctx.auth.tenant_id)
      .where(sql`payload->>'type'`, '=', 'google_sync')
      .where(sql`payload->>'campaignId'`, '=', input.campaignId)
      .executeTakeFirst();

    if (!existing) {
      await db
        .insertInto('background_jobs')
        .values({
          tenant_id: ctx.auth.tenant_id,
          queue: 'default',
          status: 'pending',
          payload: JSON.stringify({
            type: 'google_sync',
            tenantId: ctx.auth.tenant_id,
            campaignId: input.campaignId,
            requestedBy: ctx.auth.user_id,
          }),
          run_at: new Date(),
          max_attempts: 3,
        })
        .execute();
    }

    return { inserted: 0, queued: true };
  });
}

function disconnect() {
  return authProcedure
    .input(
      z.object({
        campaignId: idSchema,
        removeLocalEmails: z.boolean().default(false),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { oauthSvc, syncSvc } = getServices();

      if (input.removeLocalEmails) {
        await syncSvc.removeAllLocalEmails(ctx.auth.tenant_id, input.campaignId);
      }

      await oauthSvc.disconnect(ctx.auth.tenant_id, input.campaignId);
      return { success: true };
    });
}

function resetSync() {
  return authProcedure.input(campaignInput).mutation(async ({ ctx, input }) => {
    const { oauthSvc } = getServices();
    await oauthSvc.saveDeltaLink(ctx.auth.tenant_id, input.campaignId, NEEDS_FULL_SYNC);
    return { success: true };
  });
}

export const GoogleSyncRouter = router({
  getAuthUrl: getAuthUrl(),
  getConnectionStatus: getConnectionStatus(),
  syncNow: syncNow(),
  disconnect: disconnect(),
  resetSync: resetSync(),
});
export type GoogleSyncRouterType = typeof GoogleSyncRouter;
