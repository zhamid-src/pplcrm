import { authProcedure, router } from '../../../trpc';
import { MsOAuthService } from './ms-oauth.service';
import { MsSyncService } from './ms-sync.service';
import { BaseRepository } from '../../lib/base.repo';
import { env } from '../../../env';
import { z } from 'zod';
import { sql } from 'kysely';

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
    const state = Buffer.from(
      JSON.stringify({ userId: ctx.auth.user_id, tenantId: ctx.auth.tenant_id, returnTo: input.returnTo }),
    ).toString('base64');
    const url = await oauthSvc.getAuthUrl(state);
    return { url };
  });
}

function getConnectionStatus() {
  return authProcedure.query(async ({ ctx }) => {
    const { oauthSvc } = getServices();
    const db = (BaseRepository as any)['_db'];
    const status = await oauthSvc.getConnectionStatus(ctx.auth.user_id);

    const activeJob = await db
      .selectFrom('background_jobs' as any)
      .select('id')
      .where('status', 'in', ['pending', 'processing'])
      .where('tenant_id', '=', ctx.auth.tenant_id)
      .where(sql`payload->>'type'`, '=', 'ms_sync')
      .where(sql`payload->>'userId'`, '=', ctx.auth.user_id)
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
      .selectFrom('background_jobs' as any)
      .select('id')
      .where('status', 'in', ['pending', 'processing'])
      .where('tenant_id', '=', ctx.auth.tenant_id)
      .where(sql`payload->>'type'`, '=', 'ms_sync')
      .where(sql`payload->>'userId'`, '=', ctx.auth.user_id)
      .executeTakeFirst();

    if (!existing) {
      await db
        .insertInto('background_jobs' as any)
        .values({
          tenant_id: ctx.auth.tenant_id,
          queue: 'default',
          status: 'pending',
          payload: JSON.stringify({
            type: 'ms_sync',
            userId: ctx.auth.user_id,
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
        // Signal all remaining connected users in this tenant to do a full resync next time,
        // since their locally-stored emails were just deleted.
        await oauthSvc.resetDeltaLinkForTenant(ctx.auth.tenant_id);
      }

      await oauthSvc.disconnect(ctx.auth.user_id);
      return { success: true };
    });
}

function resetSync() {
  return authProcedure.mutation(async ({ ctx }) => {
    const { oauthSvc } = getServices();
    await oauthSvc.saveDeltaLink(ctx.auth.user_id, '{}');
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
