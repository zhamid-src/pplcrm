import { FastifyPluginCallback } from 'fastify';
import { MsOAuthService } from '../ms-sync/ms-oauth.service';
import { env } from '../../../env';
import { BaseRepository } from '../../lib/base.repo';

let _oauthSvc: MsOAuthService | null = null;

function getOAuthService() {
  if (!_oauthSvc) {
    const db = (BaseRepository as any)['_db'];
    _oauthSvc = new MsOAuthService(db, {
      clientId: env.msClientId ?? '',
      clientSecret: env.msClientSecret ?? '',
      tenantId: env.msTenantId ?? 'common',
      redirectUri: env.msRedirectUri ?? `${env.apiUrl}/auth/ms/callback`,
    });
  }
  return _oauthSvc;
}

const msSyncCallbackRoute: FastifyPluginCallback = (fastify, _opts, done) => {
  fastify.get('/callback', async (req: any, reply) => {
    const { code, state, error, error_description } = req.query as Record<string, string>;

    const frontendBase = env.apiUrl.replace(':3000', ':4200'); // dev: frontend is on 4200

    if (error) {
      return reply.redirect(`${frontendBase}/settings?ms_error=${encodeURIComponent(error_description ?? error)}`);
    }

    if (!code || !state) {
      return reply.redirect(`${frontendBase}/settings?ms_error=missing_code`);
    }

    try {
      const { userId, tenantId } = JSON.parse(Buffer.from(state, 'base64').toString('utf8'));
      const oauthSvc = getOAuthService();
      await oauthSvc.handleCallback(code, userId, tenantId);
      return reply.redirect(`${frontendBase}/settings?ms_connected=1`);
    } catch (err: any) {
      const msg = err?.message ?? 'unknown_error';
      return reply.redirect(`${frontendBase}/settings?ms_error=${encodeURIComponent(msg)}`);
    }
  });

  done();
};

export default msSyncCallbackRoute;
