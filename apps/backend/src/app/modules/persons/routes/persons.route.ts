import { FastifyPluginCallback, FastifyRequest } from 'fastify';

import { PersonsController } from '../controller';
import * as schema from './persons.schema';
import { IdParam } from '../../../lib/fastify.types';

const persons = new PersonsController();

const routes: FastifyPluginCallback = (fastify, _, done) => {
  fastify.get('', schema.getAll, (req: FastifyRequest) => persons.getAll(req.headers['tenant-id'] as string));
  fastify.get('/:id', schema.findFromId, (req: IdParam) =>
    persons.getOneById({ tenant_id: req.headers['tenant-id'] as string, id: req.params.id }),
  );
  fastify.get('/count', schema.count, (req: FastifyRequest) => persons.getCount(req.headers['tenant-id'] as string));

  done();
};

export default routes;
