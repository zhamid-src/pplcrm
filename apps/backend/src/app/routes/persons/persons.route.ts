import { FastifyPluginCallback, FastifyRequest } from 'fastify';

import { PersonsController } from '../../controllers/persons.controller';
import * as schema from './persons.schema';
import { IdParam } from '../fastify.types';

const persons = new PersonsController();

/**
 * Supported HTTP routes for the persons endpoint
 */
const routes: FastifyPluginCallback = (fastify, _, done) => {
  fastify.get('', schema.getAll, (req: FastifyRequest) =>
    persons.getAll(req.headers['tenant-id'] as string),
  );
  fastify.get('/:id', schema.findFromId, (req: IdParam) =>
    persons.getById({ tenant_id: req.headers['tenant-id'] as string, id: req.params.id }),
  );
  fastify.get('/count', schema.count, (req: FastifyRequest) =>
    persons.getCount(req.headers['tenant-id'] as string),
  );

  done();
};

export default routes;
