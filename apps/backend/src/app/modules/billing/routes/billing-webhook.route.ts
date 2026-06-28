import type { FastifyPluginCallback } from 'fastify';
import { BillingController } from '../controller';

const controller = new BillingController();

const billingWebhookRoute: FastifyPluginCallback = (fastify, _opts, done) => {
  fastify.post('/webhook', async (req, reply) => {
    const signature = (req.headers['stripe-signature'] as string) || '';
    const payload = req.body as string; // Raw string thanks to custom ContentTypeParser

    try {
      await controller.handleWebhook(payload, signature);
      return reply.code(200).send({ received: true });
    } catch (err: any) {
      console.error(`❌ Webhook error: ${err.message}`);
      return reply.code(400).send({ error: err.message });
    }
  });

  done();
};

export default billingWebhookRoute;
