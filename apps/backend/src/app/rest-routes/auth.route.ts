import { FastifyPluginCallback } from 'fastify';

/**
 * No public HTTP routes for authentication
 * @param fastify
 * @param _
 * @param done
 */
const routes: FastifyPluginCallback = (_fastify, _, done) => {
  done();
};

export default routes;
