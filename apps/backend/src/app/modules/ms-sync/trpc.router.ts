import { authProcedure, router } from '../../../trpc';
import { MsOAuthService, NEEDS_FULL_SYNC } from './ms-oauth.service';
import { MsSyncService } from './ms-sync.service';
import { BaseRepository } from '../../lib/base.repo';
import { env } from '../../../env';
import { z } from 'zod';
import { sql } from 'kysely';
import { encodeOAuthState } from '../../lib/oauth-state';

let _oauthSvc: MsOAuthService | null = null;
let _syncSvc: MsSyncService | null = null;

function getServices() {
  if (!_oauthSvc || !_syncSvc) {
    const db = (BaseRepository as any)['_db']; // reuse the shared Kysely instance
    _oauthSvc = new MsOAuthService(db, {
      clientId: env.msClientId ?? '',
      clientSecret: env.msClientSecret ?? '',
      tenantId: env.msTenantId ?? 'common',
      redirectUri: env.msRedirectUri ?? `${env.apiUrl}/auth/ms/callback`,
    });
    _syncSvc = new MsSyncService(db, _oauthSvc);
  }
  return { oauthSvc: _oauthSvc, syncSvc: _syncSvc };
}

function getAuthUrl() {
  return authProcedure.input(z.object({ returnTo: z.string().optional() })).query(async ({ ctx, input }) => {
    const { oauthSvc } = getServices();
    const state = encodeOAuthState({
      userId: ctx.auth.user_id,
      tenantId: ctx.auth.tenant_id,
      returnTo: input.returnTo,
    });
    const url = await oauthSvc.getAuthUrl(state);
    return { url };
  });
}

function getConnectionStatus() {
  return authProcedure.query(async ({ ctx }) => {
    const { oauthSvc } = getServices();
    const db = (BaseRepository as any)['_db'];
    const status = await oauthSvc.getConnectionStatus(ctx.auth.tenant_id);

    const activeJob = await db
      .selectFrom('background_jobs')
      .select('id')
      .where('status', 'in', ['pending', 'processing'])
      .where('tenant_id', '=', ctx.auth.tenant_id)
      .where(sql`payload->>'type'`, '=', 'ms_sync')
      .executeTakeFirst();

    return {
      ...status,
      syncing: !!activeJob,
    };
  });
}

function syncNow() {
  return authProcedure.mutation(async ({ ctx }) => {
    const db = (BaseRepository as any)['_db'];

    const existing = await db
      .selectFrom('background_jobs')
      .select('id')
      .where('status', 'in', ['pending', 'processing'])
      .where('tenant_id', '=', ctx.auth.tenant_id)
      .where(sql`payload->>'type'`, '=', 'ms_sync')
      .executeTakeFirst();

    if (!existing) {
      await db
        .insertInto('background_jobs')
        .values({
          tenant_id: ctx.auth.tenant_id,
          queue: 'default',
          status: 'pending',
          payload: JSON.stringify({
            type: 'ms_sync',
            tenantId: ctx.auth.tenant_id,
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
        removeLocalEmails: z.boolean().default(false),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { oauthSvc, syncSvc } = getServices();

      if (input.removeLocalEmails) {
        await syncSvc.removeAllLocalEmails(ctx.auth.tenant_id);
      }

      await oauthSvc.disconnect(ctx.auth.tenant_id);
      return { success: true };
    });
}

function resetSync() {
  return authProcedure.mutation(async ({ ctx }) => {
    const { oauthSvc } = getServices();
    await oauthSvc.saveDeltaLink(ctx.auth.tenant_id, NEEDS_FULL_SYNC);
    return { success: true };
  });
}

export const MsSyncRouter = router({
  getAuthUrl: getAuthUrl(),
  getConnectionStatus: getConnectionStatus(),
  syncNow: syncNow(),
  disconnect: disconnect(),
  resetSync: resetSync(),
});
