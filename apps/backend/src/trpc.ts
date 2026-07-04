// tsco:ignore
//
import { TRPCError, initTRPC } from '@trpc/server';
import { ZodError } from 'zod';
import type { Context } from './context';
import { toTRPCError } from './app/errors/to-trpc-errors';
import superjson from 'superjson';
import { logger } from './app/logger';
import { GENERIC_SIGNIN_ERROR } from '../../../libs/common/src';

const trpc = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    logger.error({ err: error }, 'tRPC Error');
    if (error.cause) {
      logger.error({ err: error.cause }, 'tRPC Error Cause');
    }
    // Path may be on error.path, or on shape.data.path (or absent)
    const errorObj = error as unknown as Record<string, unknown>;
    const pathStr: string =
      (typeof errorObj['path'] === 'string' ? errorObj['path'] : undefined) ??
      (shape.data?.path as string | undefined) ??
      '';

    const isSignIn = pathStr === 'signIn' || pathStr.endsWith('.signIn') || pathStr === 'auth.signIn';

    // Zod/input → BAD_REQUEST in tRPC v10; zodError is also surfaced on shape.data
    const isZod =
      error.cause instanceof ZodError || Boolean((shape.data as Record<string, unknown> | undefined)?.['zodError']);

    const isZodOrBadRequest = isZod || error.code === 'BAD_REQUEST';

    // Collapse auth-ish cases
    const isCredsProblem =
      error.code === 'UNAUTHORIZED' ||
      error.code === 'NOT_FOUND' ||
      error.cause?.name === 'InvalidCredentialsError' ||
      (error.cause as unknown as Record<string, unknown> | undefined)?.['code'] === 'USER_NOT_FOUND';

    let finalShape = shape;
    if (isZod) {
      finalShape = {
        ...shape,
        data: {
          ...shape.data,
          code: 'BAD_REQUEST',
          isZodError: true,
        } as any,
      } as any;
    }

    if (isSignIn && (isZodOrBadRequest || isCredsProblem)) {
      return { ...finalShape, message: GENERIC_SIGNIN_ERROR };
    }

    // Forward safe metadata from AppError (e.g. retryAfterSec for rate limits)
    const causeData = (error.cause as any)?.data;
    if (causeData && typeof causeData === 'object' && !Array.isArray(causeData)) {
      return { ...finalShape, data: { ...finalShape.data, ...causeData } };
    }

    return finalShape;
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

export const publicProcedure = trpc.procedure.use(errorMappingMiddleware);

export const router = trpc.router;

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
      .where('id', '=', ctx.auth.user_id)
      .where('tenant_id', '=', ctx.auth.tenant_id)
      .executeTakeFirst();
    if (record) {
      user = {
        role: record.role,
        verified: record.verified === true || String(record.verified) === 'true',
      };
    }
  }

  if (!user) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }

  if (opts.type === 'mutation' && user.role === 'viewer') {
    const isExempt =
      opts.path === 'cancelEmailChange' ||
      opts.path.endsWith('.cancelEmailChange') ||
      opts.path === 'signOut' ||
      opts.path.endsWith('.signOut');
    if (!isExempt) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Viewers are not allowed to make changes.',
      });
    }
  }

  const authWithRole = {
    ...ctx.auth,
    role: user.role,
  };

  return opts.next({ ctx: { ...ctx, auth: authWithRole } });
});

export const authProcedure = publicProcedure.use(isAuthed);

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
