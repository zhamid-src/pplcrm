import { IAuthKeyPayload } from '@common';
import { inferAsyncReturnType } from '@trpc/server';
import { CreateFastifyContextOptions } from '@trpc/server/adapters/fastify';
import { createVerifier } from 'fast-jwt';

/**
 * The type of the context object passed to tRPC procedures.
 */
export type Context = inferAsyncReturnType<typeof createContext>;

/**
 * Creates the tRPC context for Fastify requests.
 *
 * Attempts to extract and verify a bearer token from the `Authorization` header
 * using the HS256 algorithm and a shared secret. If verification fails or
 * no token is provided, `auth` will be `null`.
 *
 * @param {CreateFastifyContextOptions} param0 - The Fastify request/response pair.
 * @returns {Promise<{ req: FastifyRequest; res: FastifyReply; auth: IAuthKeyPayload | null }>}
 */
export async function createContext({ req, res }: CreateFastifyContextOptions) {
  // No Authorization header provided
  if (!req.headers.authorization) {
    return { req, res, auth: null };
  }

  // Extract token from "Bearer <token>" format
  const token = req.headers.authorization.split(' ')[1];
  if (!token) {
    return { req, res, auth: null };
  }

  let payload: IAuthKeyPayload | null = null;
  const key = process.env['SHARED_SECRET'];

  try {
    // Create the verifier with the shared secret and expected algorithm
    const verifier = createVerifier({
      algorithms: ['HS256'],
      key,
      clockTimestamp: Date.now(),
      ignoreExpiration: false,
    });

    // Verify the token and cast the result to your payload interface
    payload = (await verifier(token)) as IAuthKeyPayload;
  } catch (e) {
    // Ignore verification failure; auth remains null
  }

  return { req, res, auth: payload };
}
