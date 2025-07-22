import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { getAllOptionsType } from '@common';
import { refreshTokenLink } from '@pyncz/trpc-refresh-token-link';
import { TRPCClientError, TRPCLink, createTRPCProxyClient, httpBatchLink, loggerLink } from '@trpc/client';
import { observable } from '@trpc/server/observable';
import { TRPC_ERROR_CODES_BY_KEY } from '@trpc/server/rpc';
import { TRPCRouters } from 'APPS/backend/src/app/trpc.routers';
import { get, set } from 'idb-keyval';
import { TokenService } from './token.service';

@Injectable({
  providedIn: 'root',
})
export class TRPCService<T> {
  protected tokenService = inject(TokenService);
  protected router = inject(Router);

  protected ac = new AbortController();
  protected api;

  /**
   * Create the TRPC proxy client that's used by the derived classes
   */
  constructor() {
    this.api = createTRPCProxyClient<TRPCRouters>({
      links: [loggerLink(), refreshLink(this.tokenService, this.router), errorLink, httpLink(this.tokenService)],
    });
  }

  /**
   * Public function to abort the TRPC call
   */
  public abort() {
    this.ac.abort();
  }

  /**
   * Instead of directly calling the API, the derived classes can make
   * a cached call. It creates a hash from the API name and options
   * and saves the result in the local storage. Next time someone
   * runs the cache call with the same options, it'll grab the
   * data from the cache instead of the backend
   * @param apiCall
   * @param apiName
   * @param options
   * @param refresh - Boolean to indicate if we should refresh the cache
   * @returns
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
   * Private function that takes the number of days and returns the
   * expiry date. It's used to add expiry to the cache
   */
  private addDays(days: number) {
    const date = new Date(Date.now());
    date.setDate(date.getDate() + days);
    return date;
  }

  // The hash isn't secure, but it's good enough for our purposes
  // It allows us to not use the entire stringified json as the key
  private hash(str: string) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash &= hash; // Convert to 32bit integer
    }
    return (hash >>> 0).toString(36);
  }
}

function httpLink(tokenSvc: TokenService) {
  return httpBatchLink({
    url: 'http://localhost:3000',
    headers() {
      const authToken = tokenSvc.getAuthToken();
      return authToken
        ? {
            Authorization: `Bearer ${authToken}`,
          }
        : {};
    },
  });
}

function refreshLink(tokenSvc: TokenService, router: Router): TRPCLink<TRPCRouters> {
  return refreshTokenLink({
    // Get locally stored refresh token
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

const errorLink: TRPCLink<TRPCRouters> = () => {
  // here we just got initialized in the app - this happens once per app
  // useful for storing cache for instance
  return ({ next, op }) => {
    // each link needs to return an observable which propagates results
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
// This is a proxy client that skips all the hooks and stuff
// We use it to refresh the auth token
const trpcRetryClient = createTRPCProxyClient<TRPCRouters>({
  links: [
    httpBatchLink({
      url: `http://localhost:3000`,
    }),
  ],
});
