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
import billingWebhookRoute from './modules/billing/routes/billing-webhook.route';

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
  // Register versioned /v1/persons route module
  fastify.register(personsRoute, { prefix: '/v1/persons' });

  // Register versioned /v1/households route module
  fastify.register(householdsRoute, { prefix: '/v1/households' });

  // Register authentication routes under /auth
  fastify.register(authRoute, { prefix: '/auth/' });

  // Register email routes
  fastify.register(emailsRoute, { prefix: '/v1/inbox' });

  // Register email attachments REST routes
  fastify.register(emailsApiRoute, { prefix: '/api/emails' });

  // Register files download REST route
  fastify.register(filesRoute, { prefix: '/api/files' });

  // Register public web forms submission REST routes
  fastify.register(webFormsPublicRoute, { prefix: '/api/forms' });

  // Register Stripe billing webhook route
  fastify.register(billingWebhookRoute, { prefix: '/api/billing' });

  // Microsoft OAuth2 callback (must be a REST route — browser is redirected here by Microsoft)
  fastify.register(msSyncCallbackRoute, { prefix: '/auth/ms' });

  // Google OAuth2 callback (must be a REST route — browser is redirected here by Google)
  fastify.register(googleSyncCallbackRoute, { prefix: '/auth/google' });

  // Root health check endpoint
  fastify.get('/', (_req, res) => res.send({ message: 'API healthy.' }));

  done();
};
