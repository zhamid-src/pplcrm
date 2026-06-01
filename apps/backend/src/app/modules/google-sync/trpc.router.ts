/**
 * @file tRPC router for Google Suite email sync.
 * Exposes endpoints for connecting/disconnecting a Google account
 * and triggering an on-demand email sync.
 */
import { authProcedure, router } from '../../../trpc';
import { GoogleOAuthService } from './google-oauth.service';
import { GoogleSyncService } from './google-sync.service';
import { BaseRepository } from '../../lib/base.repo';
import { env } from '../../../env';
import { z } from 'zod';
import { sql } from 'kysely';

/** Lazily-initialized services */
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

/**
 * Returns the Google OAuth authorization URL for the current user.
 */
function getAuthUrl() {
  return authProcedure.query(
    async ({ ctx }) => {
      const { oauthSvc } = getServices();
      const state = Buffer.from(JSON.stringify({ userId: ctx.auth.user_id, tenantId: ctx.auth.tenant_id })).toString('base64');
      const url = oauthSvc.getAuthUrl(state);
      return { url };
    },
  );
}

/**
 * Returns whether the current user has connected their Google account.
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
        .where(sql`payload->>'type'`, '=', 'google_sync')
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
        .where(sql`payload->>'type'`, '=', 'google_sync')
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
              type: 'google_sync',
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
 * Disconnects the user's Google account by deleting their stored tokens.
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

/** Router exposing Google sync procedures. */
export const GoogleSyncRouter = router({
  getAuthUrl: getAuthUrl(),
  getConnectionStatus: getConnectionStatus(),
  syncNow: syncNow(),
  disconnect: disconnect(),
});
export type GoogleSyncRouterType = typeof GoogleSyncRouter;
