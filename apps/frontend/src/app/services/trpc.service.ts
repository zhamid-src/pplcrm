import { Injectable } from "@angular/core";
import { Router } from "@angular/router";
import { getAllOptionsType } from "@common";
import { refreshTokenLink } from "@pyncz/trpc-refresh-token-link";
import {
  TRPCClientError,
  createTRPCProxyClient,
  httpBatchLink,
  loggerLink,
} from "@trpc/client";
import { Routers } from "APPS/backend/src/app/app.router";
import { get, set } from "idb-keyval";
import { TokenService } from "./token.service";

import { TRPCLink } from "@trpc/client";
import { observable } from "@trpc/server/observable";
import { TRPC_ERROR_CODES_BY_KEY } from "@trpc/server/rpc";

@Injectable({
  providedIn: "root",
})
export class TRPCService<T> {
  protected api;
  protected ac = new AbortController();

  constructor(
    protected tokenService: TokenService,
    protected router: Router,
  ) {
    this.api = createTRPCProxyClient<Routers>({
      links: [
        loggerLink(),
        refreshLink(this.tokenService, this.router),
        errorLink,
        httpLink(this.tokenService),
      ],
    });
  }
  public abort() {
    this.ac.abort();
  }

  protected runCachedCall(
    apiCall: Promise<Partial<T>[]>,
    apiName: string,
    options: getAllOptionsType,
    refresh: boolean,
  ) {
    // Create a cache key from the api name and the options
    const cacheKey = this.hash(
      JSON.stringify({
        apiName,
        ...options,
      }),
    );

    return this.get(cacheKey).then((cachedResult) => {
      if (refresh || !cachedResult || cachedResult.length === 0) {
        return apiCall.then((data: Partial<T>[]) => {
          return this.set(cacheKey, data).then(() => data);
        });
      }

      return cachedResult;
    });
  }

  private async get(key: string) {
    const payload = await get(key);
    return payload?.expires > Date.now() ? payload.data : null;
  }

  private set(key: string, data: Partial<T>[]) {
    return set(key, { expires: this.addDays(1), data });
  }

  private addDays = function (days: number) {
    const date = new Date(Date.now());
    date.setDate(date.getDate() + days);
    return date;
  };

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

function refreshLink(
  tokenSvc: TokenService,
  router: Router,
): TRPCLink<Routers> {
  return refreshTokenLink({
    // Get locally stored refresh token
    getRefreshToken: () => tokenSvc.getRefreshToken() as string | undefined,
    fetchJwtPairByRefreshToken: async (refreshToken) => {
      const auth_token = tokenSvc.getAuthToken() || "";
      const payload = await trpcRetryClient.auth.renewAuthToken.mutate({
        auth_token,
        refresh_token: refreshToken,
      });

      return {
        access: payload.auth_token,
        refresh: payload.refresh_token,
      };
    },
    onJwtPairFetched: (payload) =>
      tokenSvc.set(payload.access, payload.refresh),
    onRefreshFailed: () => tokenSvc.clearAll(),
    onUnauthorized: () => router.navigate(["/signin"]),
  });
}

function httpLink(tokenSvc: TokenService) {
  return httpBatchLink({
    url: "http://localhost:3000",
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

const errorLink: TRPCLink<Routers> = () => {
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
              err.message = "Please check your input and try again";
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
const trpcRetryClient = createTRPCProxyClient<Routers>({
  links: [
    httpBatchLink({
      url: `http://localhost:3000`,
    }),
  ],
});
