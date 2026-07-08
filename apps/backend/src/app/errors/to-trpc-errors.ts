import { TRPCError } from '@trpc/server';

import { AppError } from './app-errors';

/**
 * Recognise an AppError structurally, not just via `instanceof`. Under the dev server the
 * app-errors module can be evaluated twice (duplicate ESM instances), which makes `instanceof`
 * return false and silently downgrades a 401/403/404 into a generic 500. Duck-typing the
 * `status`/`code` shape keeps the mapping correct regardless of which module instance produced it.
 */
export function isAppErrorLike(err: unknown): err is AppError {
  if (err instanceof AppError) return true;
  return (
    err instanceof Error &&
    typeof (err as { status?: unknown }).status === 'number' &&
    typeof (err as { code?: unknown }).code === 'string'
  );
}

export function toTRPCError(err: unknown): TRPCError {
  if (err instanceof TRPCError) return err;

  const isDevOrTest = process.env['NODE_ENV'] !== 'production';

  if (isAppErrorLike(err)) {
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

    let message = err.message;
    if (isDevOrTest && err.cause instanceof Error) {
      message = `${err.message} (Cause: ${err.cause.message})`;
    } else if (isDevOrTest && typeof err.cause === 'string') {
      message = `${err.message} (Cause: ${err.cause})`;
    }

    return new TRPCError({
      code,
      message,
      cause: err,
    });
  }

  // Unknown/unexpected -> internal
  let message = 'Something went wrong, please try again';
  if (isDevOrTest && err instanceof Error) {
    message = `Something went wrong, please try again (Cause: ${err.message})`;
  } else if (isDevOrTest && typeof err === 'string') {
    message = `Something went wrong, please try again (Cause: ${err})`;
  }

  return new TRPCError({
    code: 'INTERNAL_SERVER_ERROR',
    message,
    cause: err,
  });
}
