import { FastifyInstance } from 'fastify';
import { HouseholdsController } from '../controllers/households.controller';
import { IdParam } from '../rest-schema/fastify.types';
import * as schema from '../rest-schema/households.schema';

const households = new HouseholdsController();

/**
 * Supported HTTP routes for the households endpoint
 */
function routes(fastify: FastifyInstance, _: never, done: () => void) {
  fastify.get('', schema.getAll, () => households.getAll());

  fastify.get('/:id', schema.findFromId, (req: IdParam) => households.getById(req.params.id));
  fastify.get('/count', schema.count, () => households.getCount());
  fastify.delete('/:id', schema.findFromId, (req: IdParam) => households.delete(req.params.id));

  done();
}

export default routes;
