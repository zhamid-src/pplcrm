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
  fastify.get('', schema.getAll, () => controller.getAll());

  fastify.get('/:id', schema.findFromId, (req: IdParam) =>
    controller.findOne(+req.params.id as never),
  );
  fastify.get('/:id/persons', personsSchema.getAll, (req: IdParam) =>
    personsController.getPersonsInHousehold(BigInt(+req.params.id)),
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
