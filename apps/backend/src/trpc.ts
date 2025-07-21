import { TRPCError, initTRPC } from "@trpc/server";
import { Context } from "./context";

const trpc = initTRPC.context<Context>().create();

export const middleware = trpc.middleware;
export const publicProcedure = trpc.procedure;
export const router = trpc.router;

const isAuthed = middleware(async (opts) => {
  const { ctx } = opts;
  if (!ctx.auth?.user_id || !ctx.auth?.tenant_id || !ctx.auth?.session_id) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
    });
  }
  return opts.next({ ctx });
});
export const authProcedure = publicProcedure.use(isAuthed);
