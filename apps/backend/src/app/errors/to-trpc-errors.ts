import { TRPCError } from '@trpc/server';

import { AppError } from './app-errors';

/** Convert our transport-agnostic AppError (or anything) into a TRPCError */
export function toTRPCError(err: unknown): TRPCError {
  if (err instanceof TRPCError) return err;

  if (err instanceof AppError) {
    // Status -> TRPC code
    const code =
      err.status === 400
        ? 'BAD_REQUEST'
        : err.status === 401
          ? 'UNAUTHORIZED'
          : err.status === 403
            ? 'FORBIDDEN'
            : err.status === 404
              ? 'NOT_FOUND'
              : err.status === 409
                ? 'CONFLICT'
                : err.status === 412
                  ? 'PRECONDITION_FAILED'
                  : err.status === 413
                    ? 'PAYLOAD_TOO_LARGE'
                    : err.status === 422
                      ? 'BAD_REQUEST'
                      : err.status === 429
                        ? 'TOO_MANY_REQUESTS'
                        : /* default */ 'INTERNAL_SERVER_ERROR';

    return new TRPCError({
      code,
      message: err.message,
      cause: err,
    });
  }

  // Unknown/unexpected -> internal
  return new TRPCError({
    code: 'INTERNAL_SERVER_ERROR',
    message: 'Something went wrong, please try again',
    cause: err,
  });
}
