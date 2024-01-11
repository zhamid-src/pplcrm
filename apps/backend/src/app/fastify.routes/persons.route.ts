import { UpdatePersonsType } from '@common';
import { FastifyInstance } from 'fastify';
import { IdParam } from '../fastify.schema/fastify.types';
import * as schema from '../fastify.schema/households.schema';
import { PersonsHelper } from '../trpc.helper/persons.helper';

const persons = new PersonsHelper();

/**
 * Supported HTTP routes for the persons endpoint
 * @param fastify
 * @param _
 * @param done
 */
function routes(fastify: FastifyInstance, _: never, done: () => void) {
  fastify.get('', schema.getAll, () => persons.findAll());

  fastify.get('/:id', schema.findFromId, (req: IdParam) => persons.findOne(BigInt(req.params.id)));
  fastify.get('/count', schema.count, (_req) => persons.getCount());
  fastify.post('', schema.update, (req) => persons.add(req.body as UpdatePersonsType));
  fastify.patch('/:id', schema.findFromId, (req: IdParam) =>
    persons.update(BigInt(req.params.id), req.body as UpdatePersonsType),
  );
  fastify.delete('/:id', schema.findFromId, (req: IdParam) =>
    persons.delete(BigInt(req.params.id)),
  );

  done();
}

export default routes;
