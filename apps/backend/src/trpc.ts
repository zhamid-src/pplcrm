import { TRPCError, initTRPC } from "@trpc/server";
import { Context } from "./context";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

const trpc = initTRPC.context<Context>().create();

export const middleware = trpc.middleware;
export const publicProcedure = trpc.procedure;
export const router = trpc.router;

const isAuthed = middleware(async (opts) => {
  const { ctx } = opts;
  if (!ctx.auth?.sub) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return opts.next({ ctx });
});
export const authProcedure = publicProcedure.use(isAuthed);
