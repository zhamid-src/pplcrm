/**
 * @file tRPC router for Microsoft Office 365 email sync.
 * Exposes endpoints for connecting/disconnecting a Microsoft account
 * and triggering an on-demand email sync.
 */
import { authProcedure, router } from '../../../trpc';
import { MsOAuthService } from './ms-oauth.service';
import { MsSyncService } from './ms-sync.service';
import { BaseRepository } from '../../lib/base.repo';
import { env } from '../../../env';
import { z } from 'zod';
import { sql } from 'kysely';

/** Lazily-initialized services (created once on first call) */
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

/**
 * Returns the Microsoft OAuth authorization URL for the current user.
 * The frontend redirects the user's browser to this URL.
 */
function getAuthUrl() {
  return authProcedure.query(
    async ({ ctx }) => {
      const { oauthSvc } = getServices();
      // State encodes user + tenant so the callback can identify the user
      const state = Buffer.from(JSON.stringify({ userId: ctx.auth.user_id, tenantId: ctx.auth.tenant_id })).toString('base64');
      const url = await oauthSvc.getAuthUrl(state);
      return { url };
    },
  );
}

/**
 * Returns whether the current user has connected their Microsoft account.
 */
function getConnectionStatus() {
  return authProcedure.query(
    async ({ ctx }) => {
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
    },
  );
}

/**
 * Triggers an on-demand email sync for the current user.
 * Returns the number of newly inserted emails.
 */
function syncNow() {
  return authProcedure.mutation(
    async ({ ctx }) => {
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
    },
  );
}

/**
 * Disconnects the user's Microsoft account by deleting their stored tokens.
 */
function disconnect() {
  return authProcedure
    .input(
      z.object({
        removeLocalEmails: z.boolean().default(false),
      }),
    )
    .mutation(
      async ({ ctx, input }) => {
        const { oauthSvc, syncSvc } = getServices();

        if (input.removeLocalEmails) {
          await syncSvc.removeAllLocalEmails(ctx.auth.tenant_id);
        }

        await oauthSvc.disconnect(ctx.auth.user_id);
        return { success: true };
      },
    );
}

/** Router exposing Microsoft sync procedures. */
export const MsSyncRouter = router({
  getAuthUrl: getAuthUrl(),
  getConnectionStatus: getConnectionStatus(),
  syncNow: syncNow(),
  disconnect: disconnect(),
});
