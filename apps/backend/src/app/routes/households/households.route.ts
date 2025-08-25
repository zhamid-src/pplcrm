/**
 * Registers REST routes for household operations.
 */
import { FastifyPluginCallback, FastifyRequest } from 'fastify';

import { HouseholdsController } from '../../controllers/households.controller';
import * as schema from './households.schema';
import { IdParam } from '../fastify.types';

const households = new HouseholdsController();

/**
 * Supported HTTP routes for the households endpoint.
 *
 * @param fastify - The Fastify instance used to register routes.
 * @param _ - Unused options object.
 * @param done - Callback to signal completion of route registration.
 */
const routes: FastifyPluginCallback = (fastify, _, done) => {
  fastify.get('', schema.getAll, (req: FastifyRequest) => households.getAll(req.headers['tenant-id'] as string));
  fastify.get('/:id', schema.findFromId, (req: IdParam) =>
    households.getOneById({ tenant_id: req.headers['tenant-id'] as string, id: req.params.id }),
  );
  fastify.get('/count', schema.count, (req: FastifyRequest) => households.getCount(req.headers['tenant-id'] as string));

  done();
};

export default routes;
