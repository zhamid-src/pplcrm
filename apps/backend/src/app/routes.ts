import { FastifyPluginCallback } from 'fastify';

import personsRoute from './rest-routes/persons.route';
import householdsRoute from './rest-routes/households.route';
import authRoute from './rest-routes/auth.route';

/**
 * Register all app routes
 */
export const routes: FastifyPluginCallback = (fastify, _opts, done) => {
  fastify.register(personsRoute, { prefix: '/v1/persons' });
  fastify.register(householdsRoute, { prefix: '/v1/households' });
  fastify.register(authRoute, { prefix: '/auth/' });

  fastify.get('/', (req, res) => res.send({ message: 'API healthy.' }));
  done();
};
