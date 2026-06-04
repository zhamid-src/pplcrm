// tsco:ignore
//
import { TRPCError, initTRPC } from '@trpc/server';
import { ZodError } from 'zod';
import type { Context } from './context';
import { toTRPCError } from './app/errors/to-trpc-errors';
import superjson from 'superjson';

const GENERIC_LOGIN_MSG = 'Please check your email and password and try again';

const trpc = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    console.error('tRPC Error:', error);
    if (error.cause) {
      console.error('tRPC Error Cause:', error.cause);
    }
    // Path may be on error.path, or on shape.data.path (or absent)
    const errorObj = error as unknown as Record<string, unknown>;
    const pathStr: string =
      (typeof errorObj['path'] === 'string' ? errorObj['path'] : undefined) ??
      (shape.data?.path as string | undefined) ??
      '';

    const isSignIn = pathStr === 'signIn' || pathStr.endsWith('.signIn') || pathStr === 'auth.signIn';

    // Zod/input → BAD_REQUEST in tRPC v10; zodError is also surfaced on shape.data
    const isZodOrBadRequest =
      Boolean((shape.data as Record<string, unknown> | undefined)?.['zodError']) ||
      error.cause instanceof ZodError ||
      error.code === 'BAD_REQUEST';

    // Collapse auth-ish cases
    const isCredsProblem =
      error.code === 'UNAUTHORIZED' ||
      error.code === 'NOT_FOUND' ||
      error.cause?.name === 'InvalidCredentialsError' ||
      (error.cause as unknown as Record<string, unknown> | undefined)?.['code'] === 'USER_NOT_FOUND';

    if (isSignIn && (isZodOrBadRequest || isCredsProblem)) {
      return { ...shape, message: GENERIC_LOGIN_MSG };
    }
    return shape;
  },
});

export const middleware = trpc.middleware;

const errorMappingMiddleware = middleware(async (opts) => {
  try {
    return await opts.next();
  } catch (err) {
    throw toTRPCError(err);
  }
});

/**
 * Public procedure: does not require authentication.
 * Extend this with `.use(...)` to add middlewares as needed.
 */
export const publicProcedure = trpc.procedure.use(errorMappingMiddleware);

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
import { BaseRepository } from './app/lib/base.repo';

const isAuthed = middleware(async (opts) => {
  const { ctx } = opts;

  if (!ctx.auth?.user_id || !ctx.auth?.tenant_id || !ctx.auth?.session_id) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }

  let user: { role: string | null; verified: boolean } | undefined;
  if (/^\d+$/.test(ctx.auth.user_id)) {
    const record = await BaseRepository.dbInstance
      .selectFrom('authusers')
      .select(['role', 'verified'])
      .where('id', '=', ctx.auth.user_id as any)
      .where('tenant_id', '=', ctx.auth.tenant_id as any)
      .executeTakeFirst();
    if (record) {
      user = {
        role: record.role,
        verified: record.verified === true || String(record.verified) === 'true',
      };
    }
  } else {
    user = { role: (ctx.auth as any).role || 'owner', verified: true };
  }

  if (!user) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }

  if (opts.type === 'mutation' && user.role === 'viewer') {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Viewers are not allowed to make changes.',
    });
  }

  const authWithRole = {
    ...ctx.auth,
    role: user.role,
  };

  return opts.next({ ctx: { ...ctx, auth: authWithRole } });
});

/**
 * Procedure requiring authentication.
 * Use this for all endpoints that must be protected.
 */
export const authProcedure = publicProcedure.use(isAuthed);

/**
 * Procedure requiring admin or owner privileges.
 */
export const adminOrOwnerProcedure = authProcedure.use(async (opts) => {
  const { ctx } = opts;
  if (ctx.auth.role !== 'admin' && ctx.auth.role !== 'owner') {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Only admins or owners can perform this action.',
    });
  }
  return opts.next({ ctx });
});
