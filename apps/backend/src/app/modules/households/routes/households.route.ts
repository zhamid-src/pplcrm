import { FastifyPluginCallback, FastifyRequest } from 'fastify';

import { HouseholdsController } from '../controller';
import * as schema from './households.schema';
import { IdParam } from '../../../lib/fastify.types';

const households = new HouseholdsController();

const routes: FastifyPluginCallback = (fastify, _, done) => {
  fastify.get('', schema.getAll, (req: FastifyRequest) => households.getAll(req.headers['tenant-id'] as string));
  fastify.get('/:id', schema.findFromId, (req: IdParam) =>
    households.getOneById({ tenant_id: req.headers['tenant-id'] as string, id: req.params.id }),
  );
  fastify.get('/count', schema.count, (req: FastifyRequest) => households.getCount(req.headers['tenant-id'] as string));

  done();
};

export default routes;
