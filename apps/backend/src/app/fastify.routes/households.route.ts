/* eslint-disable @typescript-eslint/no-explicit-any */
import { FastifyInstance } from 'fastify';
import { HouseholdsController } from '../fastify.controllers/households.controller';

const controller = new HouseholdsController();

async function routes(fastify: FastifyInstance, _: never, done: () => void) {
  fastify.get('', (req, reply) => controller.getAll(reply));

  fastify.get('/:id', (req, reply) =>
    controller.getById((req.params as any).id, reply)
  );
  fastify.get('/count', (_req, reply) => controller.getCount(reply));
  fastify.post('', (req, reply) => controller.add(req.body as never, reply));
  fastify.patch('/:id', (req, reply) =>
    controller.update((req.params as any).id, req.body as never, reply)
  );

  fastify.delete('/:id', (req, reply) =>
    controller.delete((req.params as any).id, reply)
  );

  done();
}

export default routes;
