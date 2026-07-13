import type { FastifyPluginCallback, FastifyReply, FastifyRequest } from 'fastify';
import { GoogleOAuthService } from './google-oauth.service';
import { env } from '../../../env';
import { BaseRepository } from '../../lib/base.repo';
import { decodeOAuthState } from '../../lib/oauth-state';

let _oauthSvc: GoogleOAuthService | null = null;

function getOAuthService() {
  if (!_oauthSvc) {
    const db = BaseRepository.dbInstance;
    _oauthSvc = new GoogleOAuthService(db, {
      clientId: env.googleClientId ?? '',
      clientSecret: env.googleClientSecret ?? '',
      redirectUri: env.googleRedirectUri ?? `${env.apiUrl}/auth/google/callback`,
    });
  }
  return _oauthSvc;
}

const googleSyncCallbackRoute: FastifyPluginCallback = (fastify, _opts, done) => {
  fastify.get('/callback', async (req: FastifyRequest, reply: FastifyReply) => {
    const { code, state, error, error_description } = req.query as Record<string, string>;

    const frontendBase = env.apiUrl.replace(':3000', ':4200'); // dev: frontend is on 4200

    // Verify the HMAC-signed state; a forged/expired state yields null and is
    // rejected so an attacker cannot bind this mailbox to an arbitrary account.
    const parsedState = decodeOAuthState(state);

    // Only allow a relative path that doesn't start with // (prevents open redirect)
    const safeReturnTo = parsedState?.returnTo?.match(/^\/(?!\/)/) ? parsedState.returnTo : null;
    const returnBase = safeReturnTo ? `${frontendBase}${safeReturnTo}` : `${frontendBase}/settings`;
    const sep = (base: string) => (base.includes('?') ? '&' : '?');

    if (error) {
      return reply.redirect(
        `${returnBase}${sep(returnBase)}google_error=${encodeURIComponent(error_description ?? error)}`,
      );
    }

    if (!code || !state) {
      return reply.redirect(`${returnBase}${sep(returnBase)}google_error=missing_code`);
    }

    if (!parsedState) {
      return reply.redirect(`${returnBase}${sep(returnBase)}google_error=invalid_state`);
    }

    const { userId, tenantId, campaignId } = parsedState;

    try {
      const oauthSvc = getOAuthService();
      await oauthSvc.handleCallback(code, userId, tenantId, campaignId);
      return reply.redirect(`${returnBase}${sep(returnBase)}google_connected=1`);
    } catch (err) {
      // Log the real cause server-side; never reflect internal error text back
      // into a user-facing redirect URL.
      fastify.log.error(err, 'Google OAuth callback failed');
      return reply.redirect(`${returnBase}${sep(returnBase)}google_error=connection_failed`);
    }
  });

  done();
};

export default googleSyncCallbackRoute;
