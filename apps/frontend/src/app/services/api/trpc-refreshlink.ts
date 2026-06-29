import type { Router } from '@angular/router';
import type { TRPCLink } from '@trpc/client';
import { type Operation, TRPCClientError, createTRPCClient, httpLink } from '@trpc/client';
import { type Observer, type Unsubscribable, observable } from '@trpc/server/observable';
import superjson from 'superjson';

import type { TRPCRouter } from '../../../../../backend/src/app/modules/trpc';
import { environment } from '../../../environments/environment';
import type { TokenService } from './token-service';

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

function forwardOp(op: Operation, next: NextLink, observer: Observer<unknown, unknown>): void {
  next(op).subscribe({
    next: (value) => observer.next(value),
    error: (err) => observer.error(err),
    complete: () => observer.complete(),
  });
}

let activeRefreshPromise: Promise<string | null> | null = null;

async function getValidAuthToken(tokenSvc: TokenService): Promise<string | null> {
  const authToken = tokenSvc.getAuthToken();
  if (!authToken) return null;

  if (isTokenExpired(authToken)) {
    if (activeRefreshPromise) {
      return activeRefreshPromise;
    }

    const refreshToken = tokenSvc.getRefreshToken();
    if (!refreshToken) throw new TRPCClientError('No refresh token available');

    activeRefreshPromise = (async () => {
      try {
        const payload = await trpcRetryClient.auth.renewAuthToken.mutate({
          auth_token: authToken,
          refresh_token: refreshToken,
        });

        tokenSvc.set({
          auth_token: payload.auth_token,
          refresh_token: payload.refresh_token,
        });
        return payload.auth_token;
      } finally {
        activeRefreshPromise = null;
      }
    })();

    return activeRefreshPromise;
  }
  return authToken;
}

function handleRefreshFailure(
  err: unknown,
  tokenSvc: TokenService,
  router: Router,
  observer: Observer<unknown, unknown>,
): void {
  tokenSvc.clearAll();
  void router.navigate([router.url]);
  observer.error(err instanceof TRPCClientError ? err : new TRPCClientError(String(err)));
}

function isTokenExpired(token: string | null | undefined, leewaySeconds = 30): boolean {
  if (!token) return true;

  const payload = parseJwt(token);
  if (!payload?.exp) return true;

  const now = Math.floor(Date.now() / 1000);
  return payload.exp < now + leewaySeconds;
}

function parseJwt(token: string): JwtPayload | null {
  try {
    const [, payload = ''] = token.split('.');
    return JSON.parse(atob(payload)) as JwtPayload;
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/* Public TRPC link                                                   */
/* ------------------------------------------------------------------ */

export function refreshLink(tokenSvc: TokenService, router: Router): TRPCLink<TRPCRouter> {
  return () => {
    return ({ op, next }: { op: Operation; next: NextLink }) =>
      observable<unknown, unknown>((observer) => {
        void (async () => {
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
  links: [
    httpLink({
      url: environment.apiUrl,
      transformer: superjson,
    }),
  ],
});
