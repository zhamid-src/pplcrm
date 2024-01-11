import { UpdatePersonsType } from '@common';
import { Models } from 'common/src/lib/kysely.models';
import { FastifyInstance } from 'fastify';
import { InsertObjectOrList } from 'node_modules/kysely/dist/cjs/parser/insert-values-parser';
import { PersonsController } from '../controllers/persons.controller';
import { IdParam } from '../rest-schema/fastify.types';
import * as schema from '../rest-schema/households.schema';

const persons = new PersonsController();

/**
 * Supported HTTP routes for the persons endpoint
 */
function routes(fastify: FastifyInstance, _: never, done: () => void) {
  fastify.get('', schema.getAll, () => persons.findAll());

  fastify.get('/:id', schema.findFromId, (req: IdParam) => persons.findOne(BigInt(req.params.id)));
  fastify.get('/count', schema.count, (_req) => persons.getCount());
  fastify.post('', schema.update, (req) =>
    persons.addOne(req.body as InsertObjectOrList<Models, 'persons'>),
  );
  fastify.patch('/:id', schema.findFromId, (req: IdParam) =>
    persons.update(BigInt(req.params.id), req.body as UpdatePersonsType),
  );
  fastify.delete('/:id', schema.findFromId, (req: IdParam) =>
    persons.delete(BigInt(req.params.id)),
  );

  done();
}

export default routes;
