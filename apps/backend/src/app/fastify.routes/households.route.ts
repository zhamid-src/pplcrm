import { FastifyInstance } from 'fastify';
import { HouseholdsController } from '../fastify.controllers/households.controller';
import { PersonsController } from '../fastify.controllers/persons.controller';
import { IdParam } from '../fastify.schema/fastify.types';
import * as schema from '../fastify.schema/households.schema';
import * as personsSchema from '../fastify.schema/persons.schema';

const controller = new HouseholdsController();
const personsController = new PersonsController();

/**
 * Supported HTTP routes for the households endpoint
 * @param fastify
 * @param _
 * @param done
 */
function routes(fastify: FastifyInstance, _: never, done: () => void) {
  fastify.get('', schema.getAll, (req, reply) => controller.getAll(reply));

  fastify.get('/:id', schema.findFromId, (req: IdParam, reply) =>
    controller.findOne(+req.params.id as never, reply),
  );
  fastify.get('/:id/persons', personsSchema.getAll, (req: IdParam, reply) =>
    personsController.getPersonsInHousehold(BigInt(+req.params.id), reply),
  );
  fastify.get('/count', schema.count, (_req, reply) => controller.getCount(reply));
  fastify.post('', schema.update, (req, reply) => controller.add(req.body as never, reply));
  fastify.patch('/:id', schema.findFromId, (req: IdParam, reply) =>
    controller.update(BigInt(+req.params.id), req.body as never, reply),
  );

  fastify.delete('/:id', schema.findFromId, (req: IdParam, reply) =>
    controller.delete(BigInt(+req.params.id), reply),
  );

  done();
}

export default routes;
