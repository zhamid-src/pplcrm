import { FastifyInstance } from 'fastify';

/* eslint-disable @typescript-eslint/no-var-requires */
const personsRoute = require('./routes/persons.route');
const householdsRoute = require('./routes/households.route');

export function routes(fastify: FastifyInstance, opts: never, done: () => void) {
  fastify.register(personsRoute, { prefix: '/v1/persons' });
  fastify.register(householdsRoute, { prefix: '/v1/households' });

  fastify.get('/', opts, (req, res) => res.send({ message: 'API healthy.' }));
  done();
}
