import { FastifyPluginCallback } from 'fastify';

import authRoute from './modules/auth/routes/auth.route';
import emailsRoute from './modules/emails/routes/emails.route';
import emailsApiRoute from './modules/emails/routes/emails-api.route';
import householdsRoute from './modules/households/routes/households.route';
import personsRoute from './modules/persons/routes/persons.route';
import msSyncCallbackRoute from './modules/ms-sync/ms-callback.route';
import googleSyncCallbackRoute from './modules/google-sync/google-callback.route';
import filesRoute from './modules/files/routes/files.route';
import webFormsPublicRoute from './modules/web-forms/routes/web-forms-public.route';
import volunteerEventsPublicRoute from './modules/volunteer-events/routes/volunteer-events-public.route';
import billingWebhookRoute from './modules/billing/routes/billing-webhook.route';
import newslettersWebhookRoute from './modules/newsletters/routes/newsletters-webhook.route';
import { verifyAuthToken } from './lib/auth-util';

/**
 * Registers all REST API routes for the application.
 *
 * Each route module is namespaced using a versioned or functional prefix.
 * Also registers a default root health check endpoint at `/`.
 *
 * @param fastify - The Fastify instance to attach routes to
 * @param _opts - Options passed to this plugin (currently unused)
 * @param done - Callback to indicate completion of plugin registration
 */
export const routes: FastifyPluginCallback = (fastify, _opts, done) => {
  // --- Public REST routes (No Auth required) ---
  
  // Register public web forms submission REST routes
  fastify.register(webFormsPublicRoute, { prefix: '/api/forms' });

  // Register public volunteer events REST routes
  fastify.register(volunteerEventsPublicRoute, { prefix: '/api/events' });

  // Register Stripe billing webhook route
  fastify.register(billingWebhookRoute, { prefix: '/api/billing' });

  // Register SendGrid newsletters event webhook route
  fastify.register(newslettersWebhookRoute, { prefix: '/api/newsletters' });

  // Microsoft OAuth2 callback (must be a REST route — browser is redirected here by Microsoft)
  fastify.register(msSyncCallbackRoute, { prefix: '/auth/ms' });

  // Google OAuth2 callback (must be a REST route — browser is redirected here by Google)
  fastify.register(googleSyncCallbackRoute, { prefix: '/auth/google' });

  // Root health check endpoint
  fastify.get('/', (_req, res) => res.send({ message: 'API healthy.' }));

  // --- Protected REST routes (Enforce JWT & Tenant security) ---
  fastify.register((protectedFastify, _, protectedDone) => {
    protectedFastify.addHook('preHandler', async (req, reply) => {
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        return reply.status(401).send({ error: 'Unauthorized: Missing Authorization header' });
      }
      const token = authHeader.split(' ')[1];
      if (!token) {
        return reply.status(401).send({ error: 'Unauthorized: Invalid token format' });
      }

      try {
        const payload = await verifyAuthToken(token);
        
        // Propagate authenticated context to route handlers
        req.headers['tenant-id'] = payload.tenant_id;
        req.headers['user-id'] = payload.user_id;
        (req as any).auth = payload;
      } catch (err) {
        return reply.status(401).send({ error: 'Unauthorized: Invalid or expired token' });
      }
    });

    // Register versioned /v1/persons route module
    protectedFastify.register(personsRoute, { prefix: '/v1/persons' });

    // Register versioned /v1/households route module
    protectedFastify.register(householdsRoute, { prefix: '/v1/households' });

    // Register authentication routes under /auth
    protectedFastify.register(authRoute, { prefix: '/auth/' });

    // Register email routes
    protectedFastify.register(emailsRoute, { prefix: '/v1/inbox' });

    // Register email attachments REST routes
    protectedFastify.register(emailsApiRoute, { prefix: '/api/emails' });

    // Register files download REST route
    protectedFastify.register(filesRoute, { prefix: '/api/files' });

    protectedDone();
  });

  done();
};
