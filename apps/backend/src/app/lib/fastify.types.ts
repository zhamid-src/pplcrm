/**
 * Shared Fastify request type definitions used across route files.
 */
import { FastifyRequest } from 'fastify';

/**
 * Fastify request type that includes a single `id` path parameter.
 */
export type IdParam = FastifyRequest<{
  Params: { id: string };
}>;
