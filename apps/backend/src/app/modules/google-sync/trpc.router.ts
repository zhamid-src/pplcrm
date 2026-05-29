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
      return oauthSvc.getConnectionStatus(ctx.auth.user_id);
    },
  );
}

/**
 * Triggers an on-demand email sync for the current user.
 */
function syncNow() {
  return authProcedure.mutation(
    async ({ ctx }) => {
      const { syncSvc } = getServices();
      return syncSvc.syncUser(ctx.auth.user_id, ctx.auth.tenant_id, ctx.auth.user_id);
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
