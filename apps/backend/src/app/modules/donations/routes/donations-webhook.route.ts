import type { FastifyPluginCallback } from 'fastify';
import Stripe from 'stripe';
import { env } from '../../../../env';
import { BaseRepository } from '../../../lib/base.repo';
import { hashToken } from '../../../lib/token-hash';
import { logger } from '../../../logger';

const donationsWebhookRoute: FastifyPluginCallback = (fastify, _opts, done) => {
  fastify.post('/webhook', async (req, reply) => {
    const query = req.query as { token?: string };
    const token = query.token;
    if (!token) {
      logger.error('Webhook error: Missing token query parameter');
      return reply.code(400).send({ error: 'Missing token parameter' });
    }

    let tenantId = 'unknown';
    try {
      // Resolve the tenant by the HASH of the token, never the plaintext (SECURITY-REVIEW.md 2.4).
      // Cross-tenant by design — this decides which tenant owns the token.
      // eslint-disable-next-line local/no-unscoped-db-query
      const tokenRow = await BaseRepository.dbInstance
        .selectFrom('settings')
        .select('tenant_id')
        .where('key', '=', 'donations.webhook_token')
        .where('value', '=', JSON.stringify(hashToken(token)))
        .executeTakeFirst();

      if (!tokenRow) {
        // Do not log the token value — it's a secret. The tenant is unknown at this point.
        logger.error('Webhook error: Invalid webhook token');
        return reply.code(400).send({ error: 'Invalid webhook token' });
      }

      tenantId = String(tokenRow.tenant_id);

      const signature = (req.headers['stripe-signature'] as string) || '';
      const payload = req.body as string; // Raw string thanks to ContentTypeParser setup

      // 1. Look up settings for this tenant ID in Kysely
      const secretRow = await BaseRepository.dbInstance
        .selectFrom('settings')
        .select('value')
        .where('tenant_id', '=', tenantId)
        .where('key', '=', 'donations.stripe_webhook_secret')
        .executeTakeFirst();

      const webhookSecret = secretRow?.value as string | undefined;

      const keyRow = await BaseRepository.dbInstance
        .selectFrom('settings')
        .select('value')
        .where('tenant_id', '=', tenantId)
        .where('key', '=', 'donations.stripe_secret_key')
        .executeTakeFirst();

      const stripeKey = (keyRow?.value as string | undefined) || env.stripeSecretKey;

      // Mock mode (unsigned payload parsing) requires an EXPLICIT opt-in (ALLOW_MOCK_PAYMENTS=true),
      // never merely "not production" — an unset NODE_ENV must not fail open and accept an
      // unauthenticated webhook body an attacker could forge (SECURITY-REVIEW 4.2).
      const isMock = env.allowMockPayments && (!stripeKey || stripeKey.includes('MockKey') || stripeKey === '');

      let event: Stripe.Event;

      if (isMock) {
        // Direct parse in mock/local dev mode
        event = JSON.parse(payload);
      } else {
        if (!stripeKey || stripeKey.includes('MockKey')) {
          throw new Error('Tenant donations stripe secret key not configured.');
        }
        if (!webhookSecret) {
          throw new Error('Tenant donations stripe webhook secret not configured.');
        }
        const stripe = new Stripe(stripeKey);
        event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
      }

      logger.info(`[DonationsWebhook] Persisting webhook event: ${event.id} (${event.type}) for Tenant: ${tenantId}`);

      // 2. Persist webhook event for background worker processing
      await BaseRepository.dbInstance
        .insertInto('webhook_events')
        .values({
          tenant_id: tenantId,
          stripe_event_id: event.id,
          type: event.type,
          payload: JSON.stringify(event),
          status: 'pending',
        })
        .onConflict((oc: any) => oc.column('stripe_event_id').doNothing())
        .execute();

      return reply.code(200).send({ received: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error({ err: message }, `Donations Webhook error for Tenant ${tenantId}`);
      return reply.code(400).send({ error: message });
    }
  });

  done();
};

export default donationsWebhookRoute;
