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
async function routes(fastify: FastifyInstance, _: never, done: () => void) {
  fastify.get('', schema.getAll, (req, reply) => controller.getAll(reply));

  fastify.get('/:id', schema.findFromId, (req: IdParam, reply) => {
    return controller.findOne(+req.params.id as never, reply);
  });
  fastify.post('', schema.update, (req, reply) => controller.add(req.body as never, reply));
  fastify.patch('/:id', schema.findFromId, (req: IdParam, reply) =>
    controller.update(BigInt(+req.params.id), req.body as never, reply),
  );
  fastify.get('/count', schema.count, (_req, reply) => controller.getCount(reply));
  fastify.delete('/:id', schema.findFromId, (req: IdParam, reply) =>
    controller.delete(BigInt(+req.params.id), reply),
  );

  done();
}

export default routes;
