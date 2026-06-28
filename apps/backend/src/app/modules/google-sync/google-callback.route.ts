import type { FastifyPluginCallback } from 'fastify';
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

const googleSyncCallbackRoute: FastifyPluginCallback = (fastify, _opts, done) => {
  fastify.get('/callback', async (req: any, reply) => {
    const { code, state, error, error_description } = req.query as Record<string, string>;

    const frontendBase = env.apiUrl.replace(':3000', ':4200'); // dev: frontend is on 4200

    let parsedState: { userId?: string; tenantId?: string; returnTo?: string } = {};
    if (state) {
      try {
        parsedState = JSON.parse(Buffer.from(state, 'base64').toString('utf8'));
      } catch {
        // ignore malformed state
      }
    }

    // Only allow a relative path that doesn't start with // (prevents open redirect)
    const safeReturnTo = parsedState.returnTo?.match(/^\/(?!\/)/) ? parsedState.returnTo : null;
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

    const { userId, tenantId } = parsedState;
    if (!userId || !tenantId) {
      return reply.redirect(`${returnBase}${sep(returnBase)}google_error=invalid_state`);
    }

    try {
      const oauthSvc = getOAuthService();
      await oauthSvc.handleCallback(code, userId, tenantId);
      return reply.redirect(`${returnBase}${sep(returnBase)}google_connected=1`);
    } catch (err: any) {
      const msg = err?.message ?? 'unknown_error';
      return reply.redirect(`${returnBase}${sep(returnBase)}google_error=${encodeURIComponent(msg)}`);
    }
  });

  done();
};

export default googleSyncCallbackRoute;
