import { FastifyInstance } from 'fastify';
import { HouseholdsController } from '../controllers/households.controller';
import { PersonsHouseholdsRepository } from '../repositories/persons-households.repository';
import { IdParam } from '../rest-schema/fastify.types';
import * as schema from '../rest-schema/households.schema';
import * as personsSchema from '../rest-schema/persons.schema';

const households = new HouseholdsController();
const personsHouseholds = new PersonsHouseholdsRepository();

/**
 * Supported HTTP routes for the households endpoint
 */
function routes(fastify: FastifyInstance, _: never, done: () => void) {
  fastify.get('', schema.getAll, () => households.getAll());

  fastify.get('/:id', schema.findFromId, (req: IdParam) =>
    households.getById(BigInt(req.params.id)),
  );
  fastify.get('/:id/persons', personsSchema.getAll, (req: IdParam) =>
    personsHouseholds.getPersonsInHousehold(BigInt(req.params.id)),
  );
  fastify.get('/count', schema.count, () => households.getCount());
  fastify.delete('/:id', schema.findFromId, (req: IdParam) =>
    households.delete(BigInt(req.params.id)),
  );

  done();
}

export default routes;
