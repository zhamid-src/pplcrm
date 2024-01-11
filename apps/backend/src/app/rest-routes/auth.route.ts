import { FastifyInstance } from 'fastify';

/**
 * No public HTTP routes for authentication
 * @param fastify
 * @param _
 * @param done
 */
function routes(fastify: FastifyInstance, _: never, done: () => void) {
  done();
}

export default routes;
