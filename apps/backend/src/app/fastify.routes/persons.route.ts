import { FastifyInstance } from 'fastify';
import { PersonsController } from '../fastify.controllers/persons.controller';
import { IdParam } from '../fastify.schema/fastify.types';
import * as schema from '../fastify.schema/households.schema';

const controller = new PersonsController();

/**
 * Supported HTTP routes for the persons endpoint
 * @param fastify
 * @param _
 * @param done
 */
function routes(fastify: FastifyInstance, _: never, done: () => void) {
  fastify.get('', schema.getAll, () => controller.getAll());

  fastify.get('/:id', schema.findFromId, (req: IdParam) =>
    controller.findOne(+req.params.id as never),
  );
  fastify.get('/count', schema.count, (_req) => controller.getCount());
  fastify.post('', schema.update, (req) => controller.add(req.body as never));
  fastify.patch('/:id', schema.findFromId, (req: IdParam) =>
    controller.update(BigInt(+req.params.id), req.body as never),
  );
  fastify.delete('/:id', schema.findFromId, (req: IdParam) =>
    controller.delete(BigInt(+req.params.id)),
  );

  done();
}

export default routes;
