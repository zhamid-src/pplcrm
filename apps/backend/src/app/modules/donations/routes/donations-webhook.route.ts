import { FastifyPluginCallback } from 'fastify';
import Stripe from 'stripe';
import { BaseRepository } from '../../../lib/base.repo';
import { env } from '../../../../env';

const donationsWebhookRoute: FastifyPluginCallback = (fastify, _opts, done) => {
  fastify.post('/webhook', async (req, reply) => {
    const query = req.query as { tenant_id?: string };
    const tenantId = query.tenant_id;
    if (!tenantId) {
      console.error('❌ Webhook error: Missing tenant_id query parameter');
      return reply.code(400).send({ error: 'Missing tenant_id parameter' });
    }

    const signature = (req.headers['stripe-signature'] as string) || '';
    const payload = req.body as string; // Raw string thanks to ContentTypeParser setup

    try {
      // 1. Look up settings for this tenant ID in Kysely
      const secretRow = await BaseRepository.dbInstance
        .selectFrom('settings')
        .select('value')
        .where('tenant_id', '=', tenantId as any)
        .where('key', '=', 'donations.stripe_webhook_secret')
        .executeTakeFirst();

      const webhookSecret = secretRow?.value as string | undefined;

      const keyRow = await BaseRepository.dbInstance
        .selectFrom('settings')
        .select('value')
        .where('tenant_id', '=', tenantId as any)
        .where('key', '=', 'donations.stripe_secret_key')
        .executeTakeFirst();

      const stripeKey = (keyRow?.value as string | undefined) || env.stripeSecretKey;

      const isMock = !stripeKey || stripeKey.includes('MockKey') || stripeKey === '';

      let event: Stripe.Event;

      if (isMock) {
        // Direct parse in mock/local dev mode
        event = JSON.parse(payload);
      } else {
        if (!webhookSecret) {
          throw new Error('Tenant donations stripe webhook secret not configured.');
        }
        const stripe = new Stripe(stripeKey);
        event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
      }

      console.log(
        `💳 [DonationsWebhook] Persisting webhook event: ${event.id} (${event.type}) for Tenant: ${tenantId}`,
      );

      // 2. Persist webhook event for background worker processing
      await BaseRepository.dbInstance
        .insertInto('webhook_events' as any)
        .values({
          tenant_id: tenantId,
          stripe_event_id: event.id,
          type: event.type,
          payload: event as any,
          status: 'pending',
        })
        .onConflict((oc: any) => oc.column('stripe_event_id').doNothing())
        .execute();

      return reply.code(200).send({ received: true });
    } catch (err: any) {
      console.error(`❌ Donations Webhook error for Tenant ${tenantId}: ${err.message}`);
      return reply.code(400).send({ error: err.message });
    }
  });

  done();
};

export default donationsWebhookRoute;
