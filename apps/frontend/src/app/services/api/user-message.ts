import { JSendServerError } from '../../../../../../libs/common/src';
import { TRPCClientError } from '@trpc/client';

import { ApiError } from './api-error';

/** Shown whenever a request never got a response from the backend (offline, outage, edge 503). */
export const SERVER_UNREACHABLE_MESSAGE =
  "We can't reach the server right now. Check your internet connection and try again in a moment.";

/**
 * True when the request never produced a server-authored error: the backend is down/unreachable or
 * the client is offline. A tRPC error that actually came from the server always carries a `data`
 * payload with a code; a fetch-level failure (or an edge backend-down 503 with a non-tRPC body)
 * does not. Says nothing about the session — callers must NOT treat this as a sign-out signal.
 */
export function isServerUnreachable(error: unknown): boolean {
  if (error instanceof ApiError) return isServerUnreachable(error.originalError);
  return error instanceof TRPCClientError && error.data == null;
}

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
  // A raw fetch failure would surface as browser-speak ("Failed to fetch") — translate it.
  if (isServerUnreachable(error)) {
    return SERVER_UNREACHABLE_MESSAGE;
  }
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
