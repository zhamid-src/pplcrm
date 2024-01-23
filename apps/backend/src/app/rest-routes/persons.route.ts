import { FastifyInstance } from 'fastify';

// const persons = new PersonsController();

/**
 * Supported HTTP routes for the persons endpoint
 */
function routes(fastify: FastifyInstance, _: never, done: () => void) {
  /*
  fastify.get('', schema.getAll, () => persons.getAll());

  fastify.get('/:id', schema.findFromId, (req: IdParam) => persons.getById(req.params.id));
  fastify.get('/count', schema.count, () => persons.getCount());
  fastify.post('', schema.update, (req) =>
    persons.add(req.body as OperationDataType<'persons', 'insert'>),
  );
  fastify.patch('/:id', schema.findFromId, (req: IdParam) =>
    persons.update(req.params.id, req.body as OperationDataType<'persons', 'insert'>),
  );
  fastify.delete('/:id', schema.findFromId, (req: IdParam) => persons.delete(req.params.id));
*/
  done();
}

export default routes;
