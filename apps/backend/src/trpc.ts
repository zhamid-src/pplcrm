// tsco:ignore
//
import { TRPCError, initTRPC } from '@trpc/server';
import { ZodError } from 'zod';
import type { Context } from './context';

const GENERIC_LOGIN_MSG = 'Please check your email and password and try again';

const trpc = initTRPC.context<Context>().create({
  errorFormatter({ shape, error }) {
    // Path may be on error.path, or on shape.data.path (or absent)
    const pathStr: string = (error as any).path ?? ((shape.data as any)?.path as string | undefined) ?? '';

    const isSignIn = pathStr === 'signIn' || pathStr.endsWith('.signIn') || pathStr === 'auth.signIn';

    // Zod/input → BAD_REQUEST in tRPC v10; zodError is also surfaced on shape.data
    const isZodOrBadRequest =
      Boolean((shape.data as any)?.zodError) || error.cause instanceof ZodError || error.code === 'BAD_REQUEST';

    // Collapse auth-ish cases
    const isCredsProblem =
      error.code === 'UNAUTHORIZED' ||
      error.code === 'NOT_FOUND' ||
      (error.cause as any)?.name === 'InvalidCredentialsError' ||
      (error.cause as any)?.code === 'USER_NOT_FOUND';

    if (isSignIn && (isZodOrBadRequest || isCredsProblem)) {
      return { ...shape, message: GENERIC_LOGIN_MSG };
    }
    return shape;
  },
});

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

  if (!ctx.auth?.user_id || !ctx.auth?.tenant_id || !ctx.auth?.session_id) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }
  return opts.next({ ctx: { ...ctx, auth: ctx.auth } });
});
/**
 * Procedure requiring authentication.
 * Use this for all endpoints that must be protected.
 */
export const authProcedure = publicProcedure.use(isAuthed);
