/**
 * @file tRPC router for Microsoft Office 365 email sync.
 * Exposes endpoints for connecting/disconnecting a Microsoft account
 * and triggering an on-demand email sync.
 */
import { authProcedure, router } from '../../../trpc';
import { wrapTrpc } from '../../lib/trpc/wrap-trpc';
import { MsOAuthService } from './ms-oauth.service';
import { MsSyncService } from './ms-sync.service';
import { BaseRepository } from '../../lib/base.repo';
import { env } from '../../../env';

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
    wrapTrpc(async ({ ctx }) => {
      const { oauthSvc } = getServices();
      // State encodes user + tenant so the callback can identify the user
      const state = Buffer.from(JSON.stringify({ userId: ctx.auth.user_id, tenantId: ctx.auth.tenant_id })).toString('base64');
      const url = await oauthSvc.getAuthUrl(state);
      return { url };
    }),
  );
}

/**
 * Returns whether the current user has connected their Microsoft account.
 */
function getConnectionStatus() {
  return authProcedure.query(
    wrapTrpc(async ({ ctx }) => {
      const { oauthSvc } = getServices();
      return oauthSvc.getConnectionStatus(ctx.auth.user_id);
    }),
  );
}

/**
 * Triggers an on-demand email sync for the current user.
 * Returns the number of newly inserted emails.
 */
function syncNow() {
  return authProcedure.mutation(
    wrapTrpc(async ({ ctx }) => {
      const { syncSvc } = getServices();
      return syncSvc.syncUser(ctx.auth.user_id, ctx.auth.tenant_id, ctx.auth.user_id);
    }),
  );
}

/**
 * Disconnects the user's Microsoft account by deleting their stored tokens.
 */
function disconnect() {
  return authProcedure.mutation(
    wrapTrpc(async ({ ctx }) => {
      const { oauthSvc } = getServices();
      await oauthSvc.disconnect(ctx.auth.user_id);
      return { success: true };
    }),
  );
}

/** Router exposing Microsoft sync procedures. */
export const MsSyncRouter = router({
  getAuthUrl: getAuthUrl(),
  getConnectionStatus: getConnectionStatus(),
  syncNow: syncNow(),
  disconnect: disconnect(),
});
