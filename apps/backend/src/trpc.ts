// tsco:ignore
//
import { TRPCError, initTRPC } from '@trpc/server';
import { Context } from './context';

// Initialize tRPC instance with context type
const trpc = initTRPC.context<Context>().create();

/**
 * Generic tRPC middleware export.
 * Can be used to create custom middleware for procedures.
 */
export const middleware = trpc.middleware;

/**
 * Public procedure: does not require authentication.
 * Extend this with `.use(...)` to add middlewares as needed.
 */
export const publicProcedure = trpc.procedure;

/**
 * Main tRPC router constructor.
 * Use this to define routers composed of procedures.
 */
export const router = trpc.router;

/**
 * Middleware to ensure the user is authenticated.
 *
 * Checks for required fields (`user_id`, `tenant_id`, `session_id`) in the auth context.
 * Throws a `TRPCError` with `UNAUTHORIZED` code if missing.
 */
const isAuthed = middleware(async (opts) => {
  const { ctx } = opts;

  // Ensure all required authentication fields are present
  if (!ctx.auth?.user_id || !ctx.auth?.tenant_id || !ctx.auth?.session_id) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
    });
  }

  // Pass along the context if auth is valid
  return opts.next({ ctx });
});

/**
 * Procedure requiring authentication.
 * Use this for all endpoints that must be protected.
 */
export const authProcedure = publicProcedure.use(isAuthed);
