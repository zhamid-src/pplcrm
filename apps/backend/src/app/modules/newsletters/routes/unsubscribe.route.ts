import type { FastifyPluginCallback } from 'fastify';

import { BaseRepository } from '../../../lib/base.repo';
import { checkRateLimit } from '../../../lib/rate-limiter';
import { logger } from '../../../logger';
import { decodeUnsubscribeToken } from '../unsubscribe-token';

const db = new BaseRepository('campaign_subscriptions').db;

// One-click unsubscribe for automation emails (the SendGrid newsletter path has its own
// <% unsubscribe %> substitution — this route only serves the Postmark automation path).
// The token authenticates the request: it names exactly one (tenant, person, email) and is
// HMAC-signed, so there is no session and no enumeration surface. Unsubscribing flips every
// campaign_subscriptions row for the person — an automation isn't campaign-scoped, so the
// only honest reading of "unsubscribe" here is "stop all of this organization's email".
// Deliberately NOT an email_suppressions insert: suppressions record address health
// (bounces/complaints), not consent, and a suppression would also be irreversible by the
// person re-subscribing through a form.

function confirmationPage(message: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Unsubscribed</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
           background: #f8fafc; color: #1e293b; margin: 0; padding: 40px 20px; }
    .card { max-width: 480px; margin: 40px auto; background: #fff; border: 1px solid #e2e8f0;
            border-radius: 12px; padding: 32px; text-align: center; }
    h1 { font-size: 20px; margin: 0 0 12px; }
    p { color: #475569; line-height: 1.6; margin: 0; }
  </style>
</head>
<body>
  <div class="card">
    <h1>You're unsubscribed</h1>
    <p>${message}</p>
  </div>
</body>
</html>`;
}

const unsubscribeRoute: FastifyPluginCallback = (fastify, _opts, done) => {
  fastify.get<{ Params: { token: string } }>('/:token', async (request, reply) => {
    // Tokens are unguessable, so a burst of misses is someone probing — throttle by IP.
    checkRateLimit(`unsubscribe:${request.ip}`, 30, 60 * 1000);

    const payload = decodeUnsubscribeToken(request.params.token);
    if (!payload) {
      return reply.code(404).type('text/html').send(confirmationPage('This unsubscribe link is not valid.'));
    }

    await db
      .updateTable('campaign_subscriptions')
      .set({ status: 'unsubscribed', unsubscribed_at: new Date() })
      .where('tenant_id', '=', payload.tenantId)
      .where('person_id', '=', payload.personId)
      .where('status', '!=', 'unsubscribed')
      .execute();

    logger.info(
      { tenantId: payload.tenantId, personId: payload.personId },
      '[unsubscribe] Automation-email unsubscribe processed',
    );

    return reply
      .code(200)
      .type('text/html')
      .send(confirmationPage(`${payload.email} will no longer receive emails from this organization.`));
  });

  done();
};

export default unsubscribeRoute;
