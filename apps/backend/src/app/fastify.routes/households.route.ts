import { FastifyInstance } from 'fastify';
import { HouseholdsHelper } from '../controllers/households.controller';
import { PersonsHelper } from '../controllers/persons.controller';
import { PersonsHouseholdsOperator } from '../db.operators/persons-households.operator';
import { IdParam } from '../fastify.schema/fastify.types';
import * as schema from '../fastify.schema/households.schema';
import * as personsSchema from '../fastify.schema/persons.schema';

const households = new HouseholdsHelper();
const persons = new PersonsHelper();
const personsHouseholds = new PersonsHouseholdsOperator();

/**
 * Supported HTTP routes for the households endpoint
 * @param fastify
 * @param _
 * @param done
 */
function routes(fastify: FastifyInstance, _: never, done: () => void) {
  fastify.get('', schema.getAll, () => households.findAll());

  fastify.get('/:id', schema.findFromId, (req: IdParam) =>
    households.findOne(BigInt(req.params.id)),
  );
  fastify.get('/:id/persons', personsSchema.getAll, (req: IdParam) =>
    personsHouseholds.getPersonsInHousehold(BigInt(req.params.id)),
  );
  fastify.get('/count', schema.count, (_req) => households.getCount());
  fastify.delete('/:id', schema.findFromId, (req: IdParam) =>
    households.delete(BigInt(req.params.id)),
  );

  done();
}

export default routes;
