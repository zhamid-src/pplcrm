import type { Router } from '@angular/router';
import { TRPCClientError, TRPCLink, createTRPCClient, httpBatchLink } from '@trpc/client';
import { observable } from '@trpc/server/observable';

import type { TokenService } from './token-service';
import type { TRPCRouters } from 'APPS/backend/src/app/trpc.routers';

// Passes the request on to the next link
function forwardOp(op: any, next: any, observer: any) {
  next(op).subscribe({
    next: (value: any) => observer.next(value),
    error: (err: any) => observer.error(err),
    complete: () => observer.complete(),
  });
}

// Tries to return a valid auth token, refreshing if needed
async function getValidAuthToken(tokenSvc: TokenService): Promise<string | null> {
  let authToken = tokenSvc.getAuthToken();
  if (!authToken) return null;

  if (isTokenExpired(authToken)) {
    const refreshToken = tokenSvc.getRefreshToken();
    if (refreshToken) {
      const payload = await trpcRetryClient.auth.renewAuthToken.mutate({
        auth_token: authToken,
        refresh_token: refreshToken,
      });
      tokenSvc.set({
        auth_token: payload.auth_token,
        refresh_token: payload.refresh_token,
      });
      authToken = payload.auth_token;
    } else {
      throw new TRPCClientError('No refresh token available');
    }
  }
  return authToken;
}

// Handles errors in refreshing token
function handleRefreshFailure(err: unknown, tokenSvc: TokenService, router: Router, observer: any) {
  tokenSvc.clearAll();
  router.navigate([router.url]);
  if (err instanceof TRPCClientError) observer.error(err);
  else observer.error(new TRPCClientError(String(err)));
}

// Determines if token is expired (with optional leeway in seconds)
function isTokenExpired(token: string | null | undefined, leewaySeconds = 30): boolean {
  if (!token) return true;

  const payload = parseJwt(token);
  if (!payload || !payload.exp) return true;

  // exp is in seconds since epoch
  const now = Math.floor(Date.now() / 1000);
  return payload.exp < now + leewaySeconds;
}

// Helper to decode JWT (to check expiry)
function parseJwt(token: string) {
  try {
    const [, payload] = token.split('.');
    return JSON.parse(atob(payload));
  } catch {
    return null;
  }
}

export function refreshLink(tokenSvc: TokenService, router: Router): TRPCLink<TRPCRouters> {
  return () => {
    return ({ op, next }) => {
      return observable((observer) => {
        (async () => {
          try {
            const authToken = await getValidAuthToken(tokenSvc);
            if (!authToken) {
              // No user logged in; just forward the op
              forwardOp(op, next, observer);
              return;
            }

            // Proceed with original request (with fresh or original token)
            forwardOp(op, next, observer);
          } catch (err) {
            handleRefreshFailure(err, tokenSvc, router, observer);
            return;
          }
        })();
        return () => {};
      });
    };
  };
}

/**
 * A standalone TRPC client used exclusively for refreshing auth tokens.
 * It uses no auth or refresh links to avoid recursion.
 */
const trpcRetryClient = createTRPCClient<TRPCRouters>({
  // TODO: Add environment.devURL instead of hardcoding
  links: [httpBatchLink({ url: `http://localhost:3000` })],
});
