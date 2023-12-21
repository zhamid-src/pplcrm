import { inferAsyncReturnType } from "@trpc/server";
import { CreateFastifyContextOptions } from "@trpc/server/adapters/fastify";
import { createVerifier } from "fast-jwt";

export async function createContext({ req, res }: CreateFastifyContextOptions) {
  if (!req.headers.authorization) {
    return { req, res, auth: null };
  }
  const token = req.headers.authorization.split(" ")[1];
  if (!token) {
    return { req, res, auth: null };
  }

  let payload = null;

  try {
    const verifier = createVerifier({
      key: "supersecretkey",
      clockTimestamp: Date.now(),
      ignoreExpiration: false,
    });
    payload = await verifier(token);
  } catch (e) {
    /* empty */
  }
  return { req, res, auth: payload };
}

export type Context = inferAsyncReturnType<typeof createContext>;
