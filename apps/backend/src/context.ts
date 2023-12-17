import { inferAsyncReturnType } from "@trpc/server";
import { CreateFastifyContextOptions } from "@trpc/server/adapters/fastify";
import { AuthTokenPayload, createDecoder } from "fast-jwt";

export async function createContext({ req, res }: CreateFastifyContextOptions) {
  if (!req.headers.authorization) {
    return { req, res, auth: null };
  }
  const token = req.headers.authorization.split(" ")[1];
  if (!token) {
    return { req, res, auth: null };
  }

  const decode = createDecoder();
  const payload: AuthTokenPayload = decode(token);
  return { req, res, auth: payload };
}

export type Context = inferAsyncReturnType<typeof createContext>;
