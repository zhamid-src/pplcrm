/**
 * Registers REST endpoints for authentication-related operations.
 */
import { FastifyPluginCallback, FastifyRequest } from 'fastify';

import { AuthController } from '../controller';
import { IdParam } from '../../../lib/fastify.types';

const auth = new AuthController();

/**
 * Supported HTTP routes for the auth endpoint.
 *
 * @param fastify - The Fastify instance used to register routes.
 * @param _ - Unused options object.
 * @param done - Callback to signal completion of route registration.
 */
const routes: FastifyPluginCallback = (fastify, _, done) => {
  fastify.get('', async (req: FastifyRequest, reply) => {
    const data = await auth.getAll(req.headers['tenant-id'] as string);
    return reply.jsendSuccess(data);
  });

  fastify.get('/:id', (req: IdParam) =>
    auth.getOneById({ tenant_id: req.headers['tenant-id'] as string, id: req.params.id }),
  );
  fastify.get('/count', (req: FastifyRequest) => auth.getCount(req.headers['tenant-id'] as string));

  done();
};

export default routes;
