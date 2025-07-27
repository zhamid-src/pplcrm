import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { getAllOptionsType } from '@common';
import { refreshTokenLink } from '@pyncz/trpc-refresh-token-link';
import { TRPCClientError, TRPCLink, createTRPCProxyClient, httpBatchLink, loggerLink } from '@trpc/client';
import { observable } from '@trpc/server/observable';
import { TRPC_ERROR_CODES_BY_KEY } from '@trpc/server/rpc';

import { get, set } from 'idb-keyval';

import { TokenService } from './token-service';
import { TRPCRouters } from 'APPS/backend/src/app/trpc.routers';

/**
 * A base service that wraps a TRPC proxy client with support for:
 * - Token-based authentication with automatic refresh
 * - Local caching of API responses using IndexedDB
 * - Error interception and messaging
 */
@Injectable({
  providedIn: 'root',
})
export class TRPCService<T> {
  protected readonly router = inject(Router);
  protected readonly tokenService = inject(TokenService);

  protected ac = new AbortController();

  /**
   * The proxy client created using TRPC.
   * It is available to child services via `this.api`.
   */
  protected api;

  constructor() {
    this.api = createTRPCProxyClient<TRPCRouters>({
      links: [loggerLink(), refreshLink(this.tokenService, this.router), errorLink, httpLink(this.tokenService)],
    });
  }

  /**
   * Aborts any ongoing TRPC call associated with this service.
   */
  public abort() {
    this.ac.abort();
  }

  /**
   * Executes a TRPC call and caches the result using a hash of the API name and options.
   *
   * @param apiCall - The promise representing the API call
   * @param apiName - A name for the API being called
   * @param options - Parameters passed to the API call
   * @param refresh - If true, bypasses the cache and refreshes from the backend
   * @returns A list of results, either from the cache or from the server
   */
  protected async runCachedCall(
    apiCall: Promise<Partial<T>[]>,
    apiName: string,
    options: getAllOptionsType,
    refresh: boolean,
  ) {
    const keyToHash = JSON.stringify({ apiName, ...options });
    const hashedKey = this.hash(keyToHash);
    const payload = await get(hashedKey);
    let data = payload?.expires > Date.now() ? payload.data : null;

    if (refresh || !data || data.length === 0) {
      data = await apiCall;
      await set(hashedKey, { expires: this.addDays(1), data });
    }

    return data;
  }

  /**
   * Adds the specified number of days to the current date.
   * Used to set expiry timestamps for cached API responses.
   *
   * @param days - The number of days to add
   * @returns A future date object
   */
  private addDays(days: number) {
    const date = new Date(Date.now());
    date.setDate(date.getDate() + days);
    return date;
  }

  /**
   * Generates a simple 32-bit hash for a string. Used to compress long cache keys.
   *
   * @param str - A string to hash
   * @returns A base-36 encoded short hash string
   */
  private hash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    return (hash >>> 0).toString(36);
  }
}

/**
 * Creates a TRPC HTTP batch link with the auth token included in headers.
 *
 * @param tokenSvc - The TokenService instance
 */
function httpLink(tokenSvc: TokenService) {
  return httpBatchLink({
    url: 'http://localhost:3000',
    headers() {
      const authToken = tokenSvc.getAuthToken();
      return authToken ? { Authorization: `Bearer ${authToken}` } : {};
    },
  });
}

/**
 * Handles automatic refresh of access tokens using a refresh token.
 *
 * @param tokenSvc - The TokenService for managing token storage
 * @param router - Angular router to redirect on unauthorized
 */
function refreshLink(tokenSvc: TokenService, router: Router): TRPCLink<TRPCRouters> {
  return refreshTokenLink({
    getRefreshToken: () => tokenSvc.getRefreshToken() as string | undefined,
    fetchJwtPairByRefreshToken: async (refreshToken) => {
      const auth_token = tokenSvc.getAuthToken() || '';
      const payload = await trpcRetryClient.auth.renewAuthToken.mutate({
        auth_token,
        refresh_token: refreshToken,
      });

      return {
        access: payload.auth_token,
        refresh: payload.refresh_token,
      };
    },
    onJwtPairFetched: (payload) => tokenSvc.set({ auth_token: payload.access, refresh_token: payload.refresh }),
    onRefreshFailed: () => tokenSvc.clearAll(),
    onUnauthorized: () => router.navigate([router.url]),
  });
}

/**
 * A TRPC link that intercepts errors and replaces BAD_REQUEST messages with friendlier ones.
 */
const errorLink: TRPCLink<TRPCRouters> = () => {
  return ({ next, op }) => {
    return observable((observer) => {
      const unsubscribe = next(op).subscribe({
        next(value) {
          observer.next(value);
        },
        error(err) {
          if (err instanceof TRPCClientError) {
            if (err.shape?.code === TRPC_ERROR_CODES_BY_KEY.BAD_REQUEST) {
              err.message = 'Please check your input and try again';
            }
          }
          observer.error(err);
        },
        complete() {
          observer.complete();
        },
      });
      return unsubscribe;
    });
  };
};

/**
 * A standalone TRPC client used exclusively for refreshing auth tokens.
 * It uses no auth or refresh links to avoid recursion.
 */
const trpcRetryClient = createTRPCProxyClient<TRPCRouters>({
  // TODO: Add environment.devURL instead of hardcoding
  links: [httpBatchLink({ url: `http://localhost:3000` })],
});
