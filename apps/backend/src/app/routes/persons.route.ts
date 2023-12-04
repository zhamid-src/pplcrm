/* eslint-disable @typescript-eslint/no-explicit-any */
import { FastifyInstance } from 'fastify';
import { PersonsController } from '../controllers/persons.controller';

const controller = new PersonsController();

async function routes(fastify: FastifyInstance, opts: never, done: () => void) {
  fastify.get('', opts, (req, reply) => controller.getAll(reply));
  fastify.get('/:id', opts, (req, reply) => controller.getById((req.params as any).id, reply));
  fastify.post('', opts, (req, reply) => controller.add(req.body as never, reply));
  fastify.patch('/:id', opts, (req, reply) => controller.update((req.params as any).id, req.body as never, reply));
  fastify.get('/count', opts, (_req, reply) => controller.getCount(reply));
  fastify.delete('/:id', opts, (req, reply) => controller.delete((req.params as any).id, reply));

  done();
}

export default routes;
