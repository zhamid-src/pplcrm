import { FastifyPluginCallback, FastifyRequest } from 'fastify';
import { IdParam } from './fastify.types';

export function createBasicRoutes(controller: any, schema: any): FastifyPluginCallback {
  return (fastify, _, done) => {
    fastify.get('', schema.getAll, (req: FastifyRequest) => controller.getAll(req.headers['tenant-id'] as string));
    fastify.get('/:id', schema.findFromId, (req: IdParam) =>
      controller.getOneById({ tenant_id: req.headers['tenant-id'] as string, id: req.params.id }),
    );
    fastify.get('/count', schema.count, (req: FastifyRequest) => controller.getCount(req.headers['tenant-id'] as string));
    done();
  };
}
