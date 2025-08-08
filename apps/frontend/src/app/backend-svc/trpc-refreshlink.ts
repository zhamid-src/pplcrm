import type { Router } from '@angular/router';
import { type Operation, TRPCClientError, TRPCLink, createTRPCClient, httpBatchLink } from '@trpc/client';
import { type Observer, type Unsubscribable, observable } from '@trpc/server/observable';

import type { TokenService } from './token-service';
import type { TRPCRouter } from '../../../../backend/src/app/trpc-routers';

interface JwtPayload {
  exp?: number;

  [key: string]: unknown;
}

type NextLink = (op: Operation) => ObservableLike;

/* ------------------------------------------------------------------ */
/* Local helper types                                                 */
/* ------------------------------------------------------------------ */
type ObservableLike<T = unknown, E = unknown> = {
  subscribe(args: Observer<T, E>): Unsubscribable;
};

/* ------------------------------------------------------------------ */
/* Core helpers                                                       */
/* ------------------------------------------------------------------ */

/** Pipes the request through and forwards all emissions. */
function forwardOp(op: Operation, next: NextLink, observer: Observer<unknown, unknown>): void {
  next(op).subscribe({
    next: (value) => observer.next(value),
    error: (err) => observer.error(err),
    complete: () => observer.complete(),
  });
}

/** Returns a valid auth token, refreshing if required. */
async function getValidAuthToken(tokenSvc: TokenService): Promise<string | null> {
  let authToken = tokenSvc.getAuthToken();
  if (!authToken) return null;

  if (isTokenExpired(authToken)) {
    const refreshToken = tokenSvc.getRefreshToken();
    if (!refreshToken) throw new TRPCClientError('No refresh token available');

    const payload = await trpcRetryClient.auth.renewAuthToken.mutate({
      auth_token: authToken,
      refresh_token: refreshToken,
    });

    tokenSvc.set({
      auth_token: payload.auth_token,
      refresh_token: payload.refresh_token,
    });
    authToken = payload.auth_token;
  }
  return authToken;
}

/** Clears tokens, redirects, and surfaces the error. */
function handleRefreshFailure(
  err: unknown,
  tokenSvc: TokenService,
  router: Router,
  observer: Observer<unknown, unknown>,
): void {
  tokenSvc.clearAll();
  router.navigate([router.url]);
  observer.error(err instanceof TRPCClientError ? err : new TRPCClientError(String(err)));
}

/** Simple expiry check with optional safety leeway. */
function isTokenExpired(token: string | null | undefined, leewaySeconds = 30): boolean {
  if (!token) return true;

  const payload = parseJwt(token);
  if (!payload?.exp) return true;

  const now = Math.floor(Date.now() / 1000);
  return payload.exp < now + leewaySeconds;
}

/** Lightweight JWT decode (no signature validation). */
function parseJwt(token: string): JwtPayload | null {
  try {
    const [, payload] = token.split('.');
    return JSON.parse(atob(payload)) as JwtPayload;
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/* Public TRPC link                                                   */
/* ------------------------------------------------------------------ */

/**
 * A TRPC link that silently refreshes auth tokens.
 *
 * ```ts
 * createTRPCClient({ links: [refreshLink(tokenSvc, router), …] })
 * ```
 */
export function refreshLink(tokenSvc: TokenService, router: Router): TRPCLink<TRPCRouter> {
  return () => {
    return ({ op, next }: { op: Operation; next: NextLink }) =>
      observable<unknown, unknown>((observer) => {
        (async () => {
          try {
            const authToken = await getValidAuthToken(tokenSvc);

            // Guest user — just forward.
            if (!authToken) {
              forwardOp(op, next, observer);
              return;
            }

            // Authenticated user — forward with (possibly refreshed) token.
            forwardOp(op, next, observer);
          } catch (err) {
            handleRefreshFailure(err, tokenSvc, router, observer);
          }
        })();

        // No teardown logic needed.
        return;
      });
  };
}

/* ------------------------------------------------------------------ */
/* Dedicated client for token refreshes only                          */
/* ------------------------------------------------------------------ */
const trpcRetryClient = createTRPCClient<TRPCRouter>({
  // TODO: replace with environment-specific URL
  links: [httpBatchLink({ url: 'http://localhost:3000' })],
});
