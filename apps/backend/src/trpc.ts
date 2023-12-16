import { initTRPC } from "@trpc/server";
import { Context } from "./context";

export const trpc = initTRPC.context<Context>().create();

export const middleware = trpc.middleware;
export const publicProcedure = trpc.procedure;
export const router = trpc.router;
