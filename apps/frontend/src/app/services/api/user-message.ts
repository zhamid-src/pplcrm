import { JSendServerError } from '../../../../../../libs/common/src';
import { TRPCClientError } from '@trpc/client';

import { ApiError } from './api-error';

/**
 * Returns a message that is safe to show to the user.
 *
 * Server errors (tRPC / JSend) are already sanitized by the backend, so their
 * message is shown as-is. A plain `new Error('…')` is app-authored copy and
 * passes through too. Anything else (TypeError, DOMException, third-party
 * errors) would leak internals into the UI, so the caller's fallback is shown
 * instead — the full error still goes to the console via the usual handlers.
 */
export function getUserErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError || error instanceof TRPCClientError) {
    return error.message || fallback;
  }
  if (error instanceof JSendServerError) {
    return error.messageText || fallback;
  }
  if (error instanceof Error && error.constructor === Error && error.message) {
    return error.message;
  }
  return fallback;
}
