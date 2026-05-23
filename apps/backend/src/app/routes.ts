import { FastifyPluginCallback } from 'fastify';

import authRoute from './modules/auth/routes/auth.route';
import emailsRoute from './modules/emails/routes/emails.route';
import householdsRoute from './modules/households/routes/households.route';
import personsRoute from './modules/persons/routes/persons.route';
import msSyncCallbackRoute from './modules/ms-sync/ms-callback.route';

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

  // Microsoft OAuth2 callback (must be a REST route — browser is redirected here by Microsoft)
  fastify.register(msSyncCallbackRoute, { prefix: '/auth/ms' });

  // Root health check endpoint
  fastify.get('/', (_req, res) => res.send({ message: 'API healthy.' }));

  done();
};
