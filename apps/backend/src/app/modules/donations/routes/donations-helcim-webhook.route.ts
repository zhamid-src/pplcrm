import type { FastifyPluginCallback } from 'fastify';

import { env } from '../../../../env';
import { BaseRepository } from '../../../lib/base.repo';
import { hashToken } from '../../../lib/token-hash';
import { logger } from '../../../logger';
import { HelcimDonationProcessor } from '../processors/helcim-processor';

/**
 * Helcim donation webhook. Mirrors the Stripe donations webhook: the tenant is selected by the same
 * hashed `donations.webhook_token`, the signature is the primary authenticator (HMAC over the raw
 * body, verified against the tenant's `donations.helcim_webhook_secret` verifier), and a verified
 * event is persisted to `webhook_events` (source 'helcim') for the background worker to process.
 *
 * The body is thin (`{ id, type: 'cardTransaction' }`); the worker fetches the full transaction.
 * NOTE: the raw request body is required for HMAC verification — `/donations/helcim-webhook` is
 * added to the raw-body content-type parser in fastify.server.ts.
 */
const donationsHelcimWebhookRoute: FastifyPluginCallback = (fastify, _opts, done) => {
  fastify.post('/helcim-webhook', async (req, reply) => {
    const query = req.query as { token?: string };
    const token = query.token;
    if (!token) {
      logger.error('Helcim webhook error: Missing token query parameter');
      return reply.code(400).send({ error: 'Missing token parameter' });
    }

    let tenantId = 'unknown';
    try {
      // Resolve the tenant by the HASH of the token (never the plaintext) — cross-tenant by design,
      // this decides which tenant owns the token (same posture as the Stripe donations webhook).
      // eslint-disable-next-line local/no-unscoped-db-query
      const tokenRow = await BaseRepository.dbInstance
        .selectFrom('settings')
        .select('tenant_id')
        .where('key', '=', 'donations.webhook_token')
        .where('value', '=', JSON.stringify(hashToken(token)))
        .executeTakeFirst();

      if (!tokenRow) {
        logger.error('Helcim webhook error: Invalid webhook token');
        return reply.code(400).send({ error: 'Invalid webhook token' });
      }

      tenantId = String(tokenRow.tenant_id);

      const rawBody = req.body as string; // Raw string thanks to the ContentTypeParser setup

      const verifierRow = await BaseRepository.dbInstance
        .selectFrom('settings')
        .select('value')
        .where('tenant_id', '=', tenantId)
        .where('key', '=', 'donations.helcim_webhook_secret')
        .executeTakeFirst();
      const verifierToken = typeof verifierRow?.value === 'string' ? verifierRow.value : '';

      // Mock mode (skip signature verification) requires the EXPLICIT ALLOW_MOCK_PAYMENTS opt-in and
      // an unset verifier — never merely "not production" (SECURITY-REVIEW 4.2).
      const isMock = env.allowMockPayments && !verifierToken;

      if (!isMock) {
        if (!verifierToken) {
          throw new Error('Tenant Helcim webhook verifier not configured.');
        }
        const verified = HelcimDonationProcessor.verifyWebhook(
          {
            'webhook-id': String(req.headers['webhook-id'] || ''),
            'webhook-timestamp': String(req.headers['webhook-timestamp'] || ''),
            'webhook-signature': String(req.headers['webhook-signature'] || ''),
          },
          rawBody,
          verifierToken,
        );
        if (!verified) {
          throw new Error('Helcim webhook signature verification failed.');
        }
      }

      const parsed: unknown = typeof rawBody === 'string' ? JSON.parse(rawBody) : rawBody;
      const body = (parsed && typeof parsed === 'object' ? parsed : {}) as { id?: unknown; type?: unknown };
      const transactionId = body.id != null ? String(body.id) : '';
      const type = body.type != null ? String(body.type) : 'cardTransaction';
      if (!transactionId) {
        throw new Error('Helcim webhook missing transaction id.');
      }

      logger.info(`[HelcimWebhook] Persisting webhook event: ${transactionId} (${type}) for Tenant: ${tenantId}`);

      await BaseRepository.dbInstance
        .insertInto('webhook_events')
        .values({
          tenant_id: tenantId,
          // Namespaced so a Helcim id never collides with a Stripe event id in the unique index.
          stripe_event_id: `helcim_${transactionId}`,
          type,
          // Thin marker payload; the worker fetches the full transaction via the Helcim API.
          payload: JSON.stringify({ source: 'helcim', id: transactionId, type }),
          status: 'pending',
        })
        .onConflict((oc) => oc.column('stripe_event_id').doNothing())
        .execute();

      return reply.code(200).send({ received: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error({ err: message }, `Helcim Donations Webhook error for Tenant ${tenantId}`);
      return reply.code(400).send({ error: message });
    }
  });

  done();
};

export default donationsHelcimWebhookRoute;
