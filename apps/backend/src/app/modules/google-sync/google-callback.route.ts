/**
 * @file REST route for the Google OAuth2 callback.
 * Google redirects the user's browser here after they consent.
 */
import { FastifyPluginCallback } from 'fastify';
import { GoogleOAuthService } from './google-oauth.service';
import { env } from '../../../env';
import { BaseRepository } from '../../lib/base.repo';

let _oauthSvc: GoogleOAuthService | null = null;

function getOAuthService() {
  if (!_oauthSvc) {
    const db = (BaseRepository as any)['_db'];
    _oauthSvc = new GoogleOAuthService(db, {
      clientId: env.googleClientId ?? '',
      clientSecret: env.googleClientSecret ?? '',
      redirectUri: env.googleRedirectUri ?? `${env.apiUrl}/auth/google/callback`,
    });
  }
  return _oauthSvc;
}

/**
 * Handles the OAuth authorization code redirect from Google.
 * Exchanges the code for tokens, stores them, then redirects to the settings page.
 */
const googleSyncCallbackRoute: FastifyPluginCallback = (fastify, _opts, done) => {
  fastify.get('/callback', async (req: any, reply) => {
    const { code, state, error, error_description } = req.query as Record<string, string>;

    const frontendBase = env.apiUrl.replace(':3000', ':4200'); // dev: frontend is on 4200

    if (error) {
      return reply.redirect(`${frontendBase}/settings?google_error=${encodeURIComponent(error_description ?? error)}`);
    }

    if (!code || !state) {
      return reply.redirect(`${frontendBase}/settings?google_error=missing_code`);
    }

    try {
      const { userId, tenantId } = JSON.parse(Buffer.from(state, 'base64').toString('utf8'));
      const oauthSvc = getOAuthService();
      await oauthSvc.handleCallback(code, userId, tenantId);
      return reply.redirect(`${frontendBase}/settings?google_connected=1`);
    } catch (err: any) {
      const msg = err?.message ?? 'unknown_error';
      return reply.redirect(`${frontendBase}/settings?google_error=${encodeURIComponent(msg)}`);
    }
  });

  done();
};

export default googleSyncCallbackRoute;
