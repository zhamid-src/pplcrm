import { FastifyPluginCallback } from 'fastify';

import authRoute from './routes/auth/auth.route';
import householdsRoute from './routes/households/households.route';
import personsRoute from './routes/persons/persons.route';

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

  // Root health check endpoint
  fastify.get('/', (_req, res) => res.send({ message: 'API healthy.' }));

  done();
};
