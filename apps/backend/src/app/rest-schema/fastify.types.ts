import { FastifyRequest } from 'fastify';

export type IdParam = FastifyRequest<{
  Params: { id: string };
}>;
