import { FastifyPluginCallback } from 'fastify';

// const households = new HouseholdsController();

/**
 * Supported HTTP routes for the households endpoint
 */
const routes: FastifyPluginCallback = (fastify, _, done) => {
  /*
  fastify.get('', schema.getAll, () => households.getAll());

  fastify.get('/:id', schema.findFromId, (req: IdParam) => households.getById(req.params.id));
  fastify.get('/count', schema.count, () => households.getCount());
  fastify.delete('/:id', schema.findFromId, (req: IdParam) => households.delete(req.params.id));
  */

  done();
};

export default routes;
