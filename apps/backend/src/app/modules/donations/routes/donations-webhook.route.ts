import type { FastifyPluginCallback } from 'fastify';
import type Stripe from 'stripe';
import { env } from '../../../../env';
import { BaseRepository } from '../../../lib/base.repo';
import { getStripe } from '../../../lib/stripe-platform-client';
import { logger } from '../../../logger';
import { STRIPE_ACCOUNT_ID_KEY } from '../stripe-connect';

/**
 * Stripe Connect webhook for donations — ONE platform endpoint for every tenant's connected
 * account (Dashboard: "Listen to events on connected accounts", secret =
 * STRIPE_CONNECT_WEBHOOK_SECRET). The tenant is resolved from `event.account`; there is no
 * per-tenant `?token` or webhook secret anymore (the tokened flow lives on for Helcim only,
 * in donations-helcim-webhook.route.ts).
 */
const donationsWebhookRoute: FastifyPluginCallback = (fastify, _opts, done) => {
  fastify.post('/webhook', async (req, reply) => {
    try {
      const signature = (req.headers['stripe-signature'] as string) || '';
      const payload = req.body as string; // Raw string thanks to ContentTypeParser setup

      // Mock mode (unsigned payload parsing) requires an EXPLICIT opt-in (ALLOW_MOCK_PAYMENTS=true),
      // never merely "not production" — an unset NODE_ENV must not fail open and accept an
      // unauthenticated webhook body an attacker could forge (SECURITY-REVIEW 4.2).
      const isMock = env.allowMockPayments && !env.stripeConnectWebhookSecret;

      let event: Stripe.Event;
      if (isMock) {
        event = JSON.parse(payload);
      } else {
        if (!env.stripeConnectWebhookSecret) {
          throw new Error('STRIPE_CONNECT_WEBHOOK_SECRET is not configured.');
        }
        event = getStripe().webhooks.constructEvent(payload, signature, env.stripeConnectWebhookSecret);
      }

      // Resolve the tenant that owns the connected account. In mock mode the forged-locally event
      // has no `account`, so fall back to the tenantId our own checkout metadata carries.
      let tenantId: string | undefined;
      if (event.account) {
        // Cross-tenant by design — this decides which tenant owns the connected account (same
        // posture as the former webhook-token lookup; SECURITY-REVIEW.md 2.4).
        // eslint-disable-next-line local/no-unscoped-db-query
        const accountRow = await BaseRepository.dbInstance
          .selectFrom('settings')
          .select('tenant_id')
          .where('key', '=', STRIPE_ACCOUNT_ID_KEY)
          .where('value', '=', JSON.stringify(event.account))
          .executeTakeFirst();
        tenantId = accountRow ? String(accountRow.tenant_id) : undefined;
      } else if (isMock) {
        const object = (event.data?.object ?? {}) as { metadata?: Record<string, string> };
        tenantId = object.metadata?.['tenantId'];
      }

      if (!tenantId) {
        // Signature verified but we don't know the account (e.g. a connected account we've
        // forgotten, or a platform-scoped event delivered here by misconfiguration). Acknowledge
        // with 200 so Stripe doesn't retry forever; log for investigation.
        logger.warn(
          `[DonationsWebhook] No tenant for event ${event.id} (${event.type}, account=${event.account ?? 'none'}) — acknowledged and skipped`,
        );
        return reply.code(200).send({ received: true });
      }

      logger.info(`[DonationsWebhook] Persisting webhook event: ${event.id} (${event.type}) for Tenant: ${tenantId}`);

      // Persist for background worker processing (idempotent on stripe_event_id).
      await BaseRepository.dbInstance
        .insertInto('webhook_events')
        .values({
          tenant_id: tenantId,
          stripe_event_id: event.id,
          type: event.type,
          payload: JSON.stringify(event),
          status: 'pending',
        })
        .onConflict((oc) => oc.column('stripe_event_id').doNothing())
        .execute();

      return reply.code(200).send({ received: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error({ err: message }, 'Donations Connect webhook error');
      return reply.code(400).send({ error: message });
    }
  });

  done();
};

export default donationsWebhookRoute;
