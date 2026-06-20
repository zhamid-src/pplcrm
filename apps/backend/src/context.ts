import { IAuthKeyPayload } from '../../../libs/common/src';
import { inferAsyncReturnType } from '@trpc/server';
import { CreateFastifyContextOptions } from '@trpc/server/adapters/fastify';

import { verifyAuthToken } from './app/lib/auth-util';

export type Context = inferAsyncReturnType<typeof createContext>;

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

  try {
    payload = await verifyAuthToken(token);
  } catch (e) {
    // Ignore verification failure; auth remains null
  }

  return { req, res, auth: payload };
}
