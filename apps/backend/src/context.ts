import { inferAsyncReturnType } from '@trpc/server';
import { CreateFastifyContextOptions } from '@trpc/server/adapters/fastify';
import { db } from './app/kysely';

export function createContext({ req, res }: CreateFastifyContextOptions) {
  const user = { name: req?.headers?.['username'] ?? 'anonymous' };

  return { req, res, user, db };
}

export type Context = inferAsyncReturnType<typeof createContext>;
