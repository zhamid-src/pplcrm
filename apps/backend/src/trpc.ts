import { initTRPC } from "@trpc/server";
import { Context } from "./context";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

export const trpc = initTRPC.context<Context>().create();

export const middleware = trpc.middleware;
export const publicProcedure = trpc.procedure;
export const router = trpc.router;
