import { inferAsyncReturnType } from '@trpc/server';
import { CreateFastifyContextOptions } from '@trpc/server/adapters/fastify';
import { createVerifier } from 'fast-jwt';

export type Context = inferAsyncReturnType<typeof createContext>;

/**
 * Create the fastify context
 * @param param0
 * @returns
 */
export async function createContext({ req, res }: CreateFastifyContextOptions) {
  if (!req.headers.authorization) {
    return { req, res, auth: null };
  }
  const token = req.headers.authorization.split(' ')[1];
  if (!token) {
    return { req, res, auth: null };
  }

  let payload = null;
  const key = process.env['SHARED_SECRET'];
  try {
    const verifier = createVerifier({
      algorithms: ['HS256'],
      key,
      clockTimestamp: Date.now(),
      ignoreExpiration: false,
    });
    payload = await verifier(token);
  } catch (e) {
    /* empty */
  }
  return { req, res, auth: payload };
}
